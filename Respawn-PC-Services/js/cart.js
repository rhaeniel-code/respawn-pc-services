// ============================================================
// RESPawn PC Services
// CART
// ============================================================

import {
    cartCount,
    cartTotal,
    escapeText,
    getCart,
    money,
    removeFromCart,
    saveCart,
    updateCartBadges
} from "./store-utils.js";

const cartEmpty = document.getElementById("cartEmpty");
const cartContent = document.getElementById("cartContent");
const cartItems = document.getElementById("cartItems");
const cartItemCount = document.getElementById("cartItemCount");
const cartTotalElement = document.getElementById("cartTotal");

function render() {
    const cart = getCart();
    const hasItems = cart.length > 0;

    cartEmpty.hidden = hasItems;
    cartContent.hidden = !hasItems;

    if (!hasItems) {
        updateCartBadges();
        return;
    }

    cartItems.innerHTML = cart.map((item) => `
        <article class="store-cart-item" data-product-id="${item.productId}">
            <div class="store-cart-thumb">
                ${item.image ? `<img src="${escapeText(item.image)}" alt="${escapeText(item.name)}" onerror="this.parentElement.innerHTML='<span>PC</span>'">` : "<span>PC</span>"}
            </div>
            <div class="store-cart-item-copy">
                <p class="store-product-category">${escapeText(item.category || "Accessory")}</p>
                <h3>${escapeText(item.name)}</h3>
                <span>${money(item.price)} each</span>
            </div>
            <div class="store-cart-quantity">
                <button type="button" data-action="decrease">−</button>
                <input type="number" min="1" value="${Number(item.quantity) || 1}" aria-label="Quantity for ${item.name}">
                <button type="button" data-action="increase">+</button>
            </div>
            <strong class="store-cart-line-total">${money((Number(item.price) || 0) * (Number(item.quantity) || 0))}</strong>
            <button type="button" class="store-cart-remove" data-action="remove">Remove</button>
        </article>
    `).join("");

    cartItemCount.textContent = String(cartCount());
    cartTotalElement.textContent = money(cartTotal());
    updateCartBadges();
}

cartItems.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const itemElement = actionButton.closest(".store-cart-item");
    const productId = itemElement?.dataset.productId;
    if (!productId) return;

    const cart = getCart();
    const item = cart.find((entry) => entry.productId === productId);
    if (!item) return;

    if (actionButton.dataset.action === "remove") {
        removeFromCart(productId);
        render();
        return;
    }

    if (actionButton.dataset.action === "decrease") {
        item.quantity = Math.max(1, item.quantity - 1);
    }

    if (actionButton.dataset.action === "increase") {
        const stock = Number(item.stock) || 0;
        if (stock > 0 && item.quantity < stock) {
            item.quantity += 1;
        }
    }

    saveCart(cart);
    render();
});

cartItems.addEventListener("change", (event) => {
    if (!event.target.matches("input[type='number']")) return;

    const itemElement = event.target.closest(".store-cart-item");
    const productId = itemElement?.dataset.productId;
    const cart = getCart();
    const item = cart.find((entry) => entry.productId === productId);
    if (!item) return;

    const stock = Number(item.stock) || 0;
    let quantity = Math.max(1, Number(event.target.value) || 1);
    if (stock > 0) quantity = Math.min(quantity, stock);
    item.quantity = quantity;
    saveCart(cart);
    render();
});

render();
updateCartBadges();
