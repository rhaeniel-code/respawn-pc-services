// ============================================================
// RESPawn PC Services
// ADMIN STORE ORDERS
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    runTransaction,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { auth, db } from "./firebase.js";
import {
    escapeHTML,
    formatPHP,
    formatTimestamp,
    showToast
} from "./ui.js";

const logoutButton = document.getElementById("logoutButton");
const orderSearch = document.getElementById("orderSearch");
const orderStatusFilter = document.getElementById("orderStatusFilter");
const adminOrdersList = document.getElementById("adminOrdersList");
const adminOrderCount = document.getElementById("adminOrderCount");

let orders = [];

function statusClassName(status) {
    return String(status || "Pending").toLowerCase().replaceAll(" ", "-");
}

function renderOrders() {
    const search = orderSearch.value.trim().toLowerCase();
    const status = orderStatusFilter.value;

    const filtered = orders.filter((order) => {
        const searchable = `${order.orderNumber || ""} ${order.customerName || ""} ${order.email || ""}`.toLowerCase();
        return searchable.includes(search) && (!status || order.orderStatus === status);
    });

    adminOrderCount.textContent = `${filtered.length} order${filtered.length === 1 ? "" : "s"}`;

    adminOrdersList.innerHTML = filtered.map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const status = order.orderStatus || "Pending";
        const paymentStatus = order.paymentStatus || "Unpaid";
        const options = ["Pending", "Confirmed", "Processing", "Ready for Pickup", "Completed", "Cancelled"];
        const canCancel = status !== "Cancelled" && status !== "Completed";
        const canAdvance = status !== "Cancelled" && status !== "Completed";

        return `
            <article class="store-admin-order-card">
                <div class="store-admin-order-header">
                    <div>
                        <p class="store-product-category">${escapeHTML(order.orderNumber || order.id)}</p>
                        <h3>${escapeHTML(order.customerName || "Customer")}</h3>
                        <span>${escapeHTML(order.email || "")} · ${escapeHTML(order.contactNumber || "No contact")}</span>
                    </div>
                    <div class="store-admin-order-badges">
                        <span class="store-order-status status-${statusClassName(status)}">${escapeHTML(status)}</span>
                        <span class="store-payment-badge ${String(paymentStatus).toLowerCase()}">${escapeHTML(paymentStatus)}</span>
                    </div>
                </div>

                <div class="store-admin-order-grid">
                    <div><span>ITEMS</span><strong>${items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)}</strong></div>
                    <div><span>TOTAL</span><strong>${formatPHP(order.total)}</strong></div>
                    <div><span>PAYMENT</span><strong>${escapeHTML(order.paymentMethod || "Cash on Pickup")}</strong></div>
                    <div><span>PLACED</span><strong>${escapeHTML(formatTimestamp(order.createdAt))}</strong></div>
                </div>

                <div class="store-admin-order-items">
                    ${items.map((item) => `
                        <div class="store-admin-order-item">
                            <span>${item.quantity}× ${escapeHTML(item.name)}</span>
                            <strong>${formatPHP(item.subtotal)}</strong>
                        </div>
                    `).join("") || "<span>No item details available.</span>"}
                </div>

                <div class="store-admin-order-actions">
                    <label class="store-status-control">
                        <span>Status</span>
                        <select data-status-order="${escapeHTML(order.id)}" ${canAdvance ? "" : "disabled"}>
                            ${options.map((option) => `<option value="${escapeHTML(option)}" ${status === option ? "selected" : ""}>${escapeHTML(option)}</option>`).join("")}
                        </select>
                    </label>
                    <button type="button" class="secondary-button" data-payment-order="${escapeHTML(order.id)}" ${paymentStatus === "Paid" ? "disabled" : ""}>
                        ${paymentStatus === "Paid" ? "Paid" : "Mark Paid"}
                    </button>
                    <button type="button" class="secondary-button danger-outline" data-cancel-order="${escapeHTML(order.id)}" ${canCancel ? "" : "disabled"}>
                        Cancel &amp; Restock
                    </button>
                </div>
            </article>
        `;
    }).join("") || `
        <div class="store-empty compact-store-empty">
            <div class="store-empty-icon">0</div>
            <h3>No matching orders</h3>
            <p>There are no store orders for the current filters.</p>
        </div>
    `;
}

async function setOrderStatus(order, nextStatus) {
    const currentStatus = order.orderStatus || "Pending";

    if (currentStatus === "Completed" || currentStatus === "Cancelled") return;

    if (nextStatus === "Cancelled") {
        await cancelAndRestock(order);
        return;
    }

    await updateDoc(doc(db, "orders", order.id), {
        orderStatus: nextStatus,
        updatedAt: new Date()
    });

    showToast(`Order updated to ${nextStatus}.`, "success");
}

async function markPaid(order) {
    if (order.paymentStatus === "Paid") return;

    const selectedMethod = order.paymentMethod || "Cash on Pickup";
    const confirmed = window.confirm(`Record ${selectedMethod} payment for ${order.orderNumber || order.id}?`);
    if (!confirmed) return;

    await updateDoc(doc(db, "orders", order.id), {
        paymentStatus: "Paid",
        paidAt: new Date(),
        paymentMethod: selectedMethod,
        updatedAt: new Date()
    });

    showToast("Store payment recorded.", "success");
}

async function cancelAndRestock(order) {
    if (order.orderStatus === "Completed" || order.orderStatus === "Cancelled") return;

    const confirmed = window.confirm(`Cancel ${order.orderNumber || order.id} and return the items to inventory?`);
    if (!confirmed) return;

    await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, "orders", order.id);
        const orderSnapshot = await transaction.get(orderRef);
        if (!orderSnapshot.exists()) throw new Error("Order no longer exists.");

        const latestOrder = orderSnapshot.data();
        if (latestOrder.orderStatus === "Cancelled" || latestOrder.stockRestored) {
            return;
        }
        if (latestOrder.orderStatus === "Completed") {
            throw new Error("Completed orders cannot be cancelled.");
        }

        const items = Array.isArray(latestOrder.items) ? latestOrder.items : [];
        const productSnapshots = [];

        for (const item of items) {
            const productRef = doc(db, "products", item.productId);
            const productSnapshot = await transaction.get(productRef);
            productSnapshots.push({ item, productRef, productSnapshot });
        }

        for (const entry of productSnapshots) {
            if (!entry.productSnapshot.exists()) continue;
            const stock = Number(entry.productSnapshot.data().stock) || 0;
            transaction.update(entry.productRef, {
                stock: stock + (Number(entry.item.quantity) || 0),
                lastRestoredOrderId: order.id,
                stockUpdatedAt: new Date()
            });
        }

        transaction.update(orderRef, {
            orderStatus: "Cancelled",
            stockRestored: true,
            cancelledAt: new Date(),
            updatedAt: new Date()
        });
    });

    showToast("Order cancelled and inventory restocked.", "success");
}

adminOrdersList.addEventListener("change", async (event) => {
    const select = event.target.closest("[data-status-order]");
    if (!select) return;

    const order = orders.find((item) => item.id === select.dataset.statusOrder);
    if (!order) return;

    const previous = order.orderStatus || "Pending";
    try {
        await setOrderStatus(order, select.value);
    } catch (error) {
        console.error("Order status error:", error);
        select.value = previous;
        showToast(error.message || "Order status could not be updated.", "error");
    }
});

adminOrdersList.addEventListener("click", async (event) => {
    const paymentButton = event.target.closest("[data-payment-order]");
    const cancelButton = event.target.closest("[data-cancel-order]");

    try {
        if (paymentButton) {
            const order = orders.find((item) => item.id === paymentButton.dataset.paymentOrder);
            if (order) await markPaid(order);
        }

        if (cancelButton) {
            const order = orders.find((item) => item.id === cancelButton.dataset.cancelOrder);
            if (order) await cancelAndRestock(order);
        }
    } catch (error) {
        console.error("Store order action error:", error);
        showToast(error.message || "The order action failed.", "error");
    }
});

orderSearch.addEventListener("input", renderOrders);
orderStatusFilter.addEventListener("change", renderOrders);

logoutButton.addEventListener("click", async () => {
    await signOut(auth);
    window.location.replace("/index.html");
});

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.replace("/login.html");
        return;
    }

    try {
        const profile = await getDoc(doc(db, "users", user.uid));
        if (!profile.exists() || profile.data().role !== "admin") {
            window.location.replace("/dashboard.html");
            return;
        }

        onSnapshot(
            collection(db, "orders"),
            (snapshot) => {
                orders = snapshot.docs
                    .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
                    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
                renderOrders();
            },
            (error) => {
                console.error("Admin order snapshot error:", error);
                showToast("Store orders could not be loaded.", "error");
            }
        );
    } catch (error) {
        console.error("Store admin guard error:", error);
        window.location.replace("/dashboard.html");
    }
});
