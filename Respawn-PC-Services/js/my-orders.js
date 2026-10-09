// ============================================================
// RESPawn PC Services
// CUSTOMER STORE ORDERS
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    collection,
    onSnapshot,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { auth, db } from "./firebase.js";
import {
    money,
    statusLabel,
    updateCartBadges
} from "./store-utils.js";
import { escapeHTML, formatTimestamp, showToast } from "./ui.js";

const logoutButton = document.getElementById("logoutButton");
const ordersLoading = document.getElementById("ordersLoading");
const ordersList = document.getElementById("ordersList");
const ordersEmpty = document.getElementById("ordersEmpty");
const orderCount = document.getElementById("orderCount");

let unsubscribe = null;
const params = new URLSearchParams(window.location.search);
const placedOrderId = params.get("orderId");
const notificationOrderId = params.get("notificationOrderId");
const focusedOrderId = placedOrderId || notificationOrderId;

function statusClassName(status) {
    return String(status || "Pending").toLowerCase().replaceAll(" ", "-");
}

function renderOrders(orders) {
    orderCount.textContent = `${orders.length} order${orders.length === 1 ? "" : "s"}`;
    ordersLoading.hidden = true;
    ordersEmpty.hidden = orders.length !== 0;
    ordersList.hidden = orders.length === 0;

    ordersList.innerHTML = orders.map((order) => {
        const items = Array.isArray(order.items) ? order.items : [];
        const itemNames = items.slice(0, 3).map((item) => `${item.quantity}× ${escapeHTML(item.name)}`).join(", ");
        const extra = items.length > 3 ? ` + ${items.length - 3} more` : "";

        return `
            <article id="store-order-${escapeHTML(order.id)}" data-order-id="${escapeHTML(order.id)}" class="store-order-card ${order.id === focusedOrderId ? "just-placed" : ""}">
                <div class="store-order-card-top">
                    <div>
                        <p class="store-product-category">STORE ORDER</p>
                        <h3>${escapeHTML(order.orderNumber || order.id)}</h3>
                        <span>${escapeHTML(formatTimestamp(order.createdAt))}</span>
                    </div>
                    <span class="store-order-status status-${statusClassName(order.orderStatus)}">${escapeHTML(statusLabel(order.orderStatus))}</span>
                </div>
                <div class="store-order-card-grid">
                    <div><span>ITEMS</span><strong>${escapeHTML(itemNames || "No item data")}${extra}</strong></div>
                    <div><span>TOTAL</span><strong>${money(order.total)}</strong></div>
                    <div><span>PAYMENT</span><strong>${escapeHTML(order.paymentStatus || "Unpaid")}</strong><small>${escapeHTML(order.paymentMethod || "Not selected")}</small></div>
                    <div><span>FULFILLMENT</span><strong>${escapeHTML(order.fulfillment || "Store Pickup")}</strong><small>Respawn pickup</small></div>
                </div>
            </article>
        `;
    }).join("");

    if (placedOrderId) {
        const placed = orders.find((order) => order.id === placedOrderId);
        if (placed) {
            showToast(`Order ${placed.orderNumber || placed.id} was placed successfully.`, "success");
            window.history.replaceState({}, "", "/my-orders.html");
        }
    } else if (notificationOrderId) {
        const targetCard = Array.from(
            ordersList.querySelectorAll("[data-order-id]")
        ).find((card) => card.dataset.orderId === notificationOrderId);
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
            window.history.replaceState({}, "", "/my-orders.html");
        }
    }
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.replace("/login.html");
        return;
    }

    if (unsubscribe) unsubscribe();

    const ordersQuery = query(
        collection(db, "orders"),
        where("userId", "==", user.uid)
    );

    unsubscribe = onSnapshot(
        ordersQuery,
        (snapshot) => {
            const orders = snapshot.docs
                .map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }))
                .sort((a, b) => {
                    const aSeconds = a.createdAt?.seconds || 0;
                    const bSeconds = b.createdAt?.seconds || 0;
                    return bSeconds - aSeconds;
                });
            renderOrders(orders);
        },
        (error) => {
            console.error("Orders error:", error);
            ordersLoading.hidden = true;
            ordersEmpty.hidden = false;
            ordersList.hidden = true;
            orderCount.textContent = "Unavailable";
            ordersEmpty.querySelector("h3").textContent = "Orders could not be loaded";
            ordersEmpty.querySelector("p").textContent = "Check your Firestore rules and try again.";
        }
    );
});

logoutButton.addEventListener("click", async () => {
    await signOut(auth);
    window.location.replace("/index.html");
});

updateCartBadges();
