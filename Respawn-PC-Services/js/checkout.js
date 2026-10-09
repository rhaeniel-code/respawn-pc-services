// ============================================================
// RESPawn PC Services
// STORE CHECKOUT
// ============================================================

import {
    collection,
    doc,
    getDoc,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import { auth, db } from "./firebase.js";
import {
    clearCart,
    escapeText,
    getCart,
    money,
    updateCartBadges
} from "./store-utils.js";
import { setButtonLoading } from "./ui.js";

const checkoutAuthRequired = document.getElementById("checkoutAuthRequired");
const checkoutEmpty = document.getElementById("checkoutEmpty");
const checkoutContent = document.getElementById("checkoutContent");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutName = document.getElementById("checkoutName");
const checkoutEmail = document.getElementById("checkoutEmail");
const checkoutPhone = document.getElementById("checkoutPhone");
const checkoutItems = document.getElementById("checkoutItems");
const checkoutTotal = document.getElementById("checkoutTotal");
const checkoutMessage = document.getElementById("checkoutMessage");
const placeOrderButton = document.getElementById("placeOrderButton");
const loginLink = document.getElementById("checkoutLoginLink");

let currentUser = null;
let profile = null;

function renderSummary() {
    const cart = getCart();
    checkoutItems.innerHTML = cart.map((item) => `
        <div class="store-checkout-item">
            <div><strong>${escapeText(item.name)}</strong><span>${item.quantity} × ${money(item.price)}</span></div>
            <strong>${money((Number(item.price) || 0) * (Number(item.quantity) || 0))}</strong>
        </div>
    `).join("");
    checkoutTotal.textContent = money(
        cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * (Number(item.quantity) || 0)), 0)
    );
}

function showAuthenticatedState(user) {
    const cart = getCart();
    currentUser = user;

    checkoutAuthRequired.hidden = true;

    if (!cart.length) {
        checkoutEmpty.hidden = false;
        checkoutContent.hidden = true;
        return;
    }

    checkoutEmpty.hidden = true;
    checkoutContent.hidden = false;
    checkoutName.value = profile?.fullName || user.displayName || "";
    checkoutEmail.value = user.email || "";
    renderSummary();
}

async function loadProfile(user) {
    const snapshot = await getDoc(doc(db, "users", user.uid));
    profile = snapshot.exists() ? snapshot.data() : null;
    showAuthenticatedState(user);
}

onAuthStateChanged(auth, (user) => {
    if (!user) {
        currentUser = null;
        checkoutAuthRequired.hidden = false;
        checkoutEmpty.hidden = true;
        checkoutContent.hidden = true;
        loginLink.href = `/login.html`;
        updateCartBadges();
        return;
    }

    loadProfile(user).catch((error) => {
        console.error("Checkout profile error:", error);
        showAuthenticatedState(user);
    });
});

checkoutForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    checkoutMessage.textContent = "";
    checkoutMessage.className = "form-message";

    if (!currentUser) {
        checkoutMessage.textContent = "Please sign in before placing an order.";
        checkoutMessage.className = "form-message error";
        return;
    }

    const cart = getCart();
    if (!cart.length) {
        checkoutEmpty.hidden = false;
        checkoutContent.hidden = true;
        return;
    }

    const customerName = checkoutName.value.trim();
    const contactNumber = checkoutPhone.value.trim();
    const paymentMethod = document.querySelector("input[name='paymentMethod']:checked")?.value || "Cash on Pickup";

    if (!customerName || !contactNumber) {
        checkoutMessage.textContent = "Please complete your name and contact number.";
        checkoutMessage.className = "form-message error";
        return;
    }

    setButtonLoading(placeOrderButton, true, "Placing Order...", "Place Order");

    try {
        const result = await runTransaction(db, async (transaction) => {
            const productSnapshots = [];

            for (const cartItem of cart) {
                const productRef = doc(db, "products", cartItem.productId);
                const snapshot = await transaction.get(productRef);
                productSnapshots.push({ cartItem, productRef, snapshot });
            }

            const verifiedItems = [];
            let total = 0;

            for (const entry of productSnapshots) {
                if (!entry.snapshot.exists()) {
                    throw new Error(`PRODUCT_MISSING:${entry.cartItem.name}`);
                }

                const product = entry.snapshot.data();
                const stock = Number(product.stock) || 0;
                const quantity = Number(entry.cartItem.quantity) || 0;

                if (quantity < 1) {
                    throw new Error(`INVALID_QUANTITY:${product.name}`);
                }

                if (stock < quantity) {
                    throw new Error(`INSUFFICIENT_STOCK:${product.name}:${stock}`);
                }

                const price = Number(product.price) || 0;
                const subtotal = price * quantity;
                total += subtotal;

                verifiedItems.push({
                    productId: entry.productRef.id,
                    name: product.name || entry.cartItem.name,
                    category: product.category || entry.cartItem.category || "Accessory",
                    price,
                    quantity,
                    subtotal
                });
            }

            const orderRef = doc(collection(db, "orders"));
            const orderNumber = `RPS-ORD-${orderRef.id.slice(-8).toUpperCase()}`;

            const orderData = {
                orderNumber,
                userId: currentUser.uid,
                customerName,
                email: currentUser.email || "",
                contactNumber,
                fulfillment: "Store Pickup",
                items: verifiedItems,
                itemCount: verifiedItems.reduce((sum, item) => sum + item.quantity, 0),
                total,
                paymentMethod,
                paymentStatus: "Unpaid",
                orderStatus: "Pending",
                stockRestored: false,
                createdAt: serverTimestamp()
            };

            transaction.set(orderRef, orderData);

            for (const item of verifiedItems) {
                const productRef = doc(db, "products", item.productId);
                const currentStock = productSnapshots.find((entry) => entry.productRef.id === item.productId).snapshot.data().stock;
                transaction.update(productRef, {
                    stock: Number(currentStock) - item.quantity,
                    lastOrderId: orderRef.id,
                    stockUpdatedAt: serverTimestamp()
                });

                transaction.set(doc(orderRef, "items", item.productId), {
                    productId: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.price,
                    subtotal: item.subtotal
                });
            }

            return { id: orderRef.id, orderNumber, total };
        });

        clearCart();
        checkoutForm.reset();
        window.location.replace(`/my-orders.html?orderId=${encodeURIComponent(result.id)}&placed=1`);
    } catch (error) {
        console.error("Checkout error:", error);
        const message = String(error.message || "");

        if (message.startsWith("INSUFFICIENT_STOCK:")) {
            const parts = message.split(":");
            checkoutMessage.textContent = `${parts[1] || "A product"} only has ${parts[2] || 0} unit(s) available. Return to the store and update your cart.`;
        } else if (message.startsWith("PRODUCT_MISSING:")) {
            checkoutMessage.textContent = `${message.split(":")[1] || "A product"} is no longer available. Return to the store.`;
        } else {
            checkoutMessage.textContent = "The order could not be placed. Check your connection and Firestore rules, then try again.";
        }

        checkoutMessage.className = "form-message error";
    } finally {
        setButtonLoading(placeOrderButton, false, "Placing Order...", "Place Order");
        updateCartBadges();
    }
});

updateCartBadges();
