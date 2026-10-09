// ============================================================
// RESPawn PC Services
// PRODUCT DETAILS
// ============================================================

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { db } from "./firebase.js";
import {
    addToCart,
    money,
    productVisual,
    updateCartBadges
} from "./store-utils.js";
import { showToast } from "./ui.js";

const productLoading = document.getElementById("productLoading");
const productContent = document.getElementById("productContent");
const productVisualElement = document.getElementById("productVisual");
const productCategory = document.getElementById("productCategory");
const productName = document.getElementById("productName");
const productDescription = document.getElementById("productDescription");
const productPrice = document.getElementById("productPrice");
const productStockBadge = document.getElementById("productStockBadge");
const productStockText = document.getElementById("productStockText");
const quantityInput = document.getElementById("productQuantity");
const decreaseQuantity = document.getElementById("decreaseQuantity");
const increaseQuantity = document.getElementById("increaseQuantity");
const addButton = document.getElementById("addToCartButton");
const productMessage = document.getElementById("productMessage");

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");
let product = null;

function setError(message) {
    productLoading.hidden = true;
    productContent.hidden = false;
    productContent.innerHTML = `
        <div class="store-empty compact-store-empty">
            <div class="store-empty-icon">!</div>
            <h3>${message}</h3>
            <p>The product may have been removed from the catalog.</p>
            <a href="/store.html" class="primary-button">Back to Store</a>
        </div>
    `;
}

function updateQuantityButtons() {
    if (!product) return;
    const stock = Number(product.stock) || 0;
    const current = Math.max(1, Math.min(stock || 1, Number(quantityInput.value) || 1));
    quantityInput.value = current;
    decreaseQuantity.disabled = current <= 1;
    increaseQuantity.disabled = current >= stock || stock <= 0;
}

function renderProduct() {
    const stock = Number(product.stock) || 0;
    document.title = `${product.name} - Respawn PC Services`;
    productCategory.textContent = String(product.category || "ACCESSORY").toUpperCase();
    productName.textContent = product.name || "Product";
    productDescription.textContent = product.description || "Gaming PC component or accessory available for pickup.";
    productPrice.textContent = money(product.price);
    productVisualElement.innerHTML = productVisual(product);
    productStockText.textContent = stock > 0 ? `${stock} available` : "Currently unavailable";
    productStockBadge.className = `store-stock-badge ${stock <= 0 ? "out" : stock <= 3 ? "low" : "good"}`;
    productStockBadge.textContent = stock <= 0 ? "Out of stock" : stock <= 3 ? "Low stock" : "In stock";
    addButton.disabled = stock <= 0;
    addButton.textContent = stock <= 0 ? "Sold Out" : "Add to Cart";
    quantityInput.max = String(Math.max(1, stock));
    updateQuantityButtons();
    productLoading.hidden = true;
    productContent.hidden = false;
}

if (!productId) {
    setError("Product not found");
} else {
    getDoc(doc(db, "products", productId))
        .then((snapshot) => {
            if (!snapshot.exists()) {
                setError("Product not found");
                return;
            }
            product = { id: snapshot.id, ...snapshot.data() };
            renderProduct();
        })
        .catch((error) => {
            console.error("Product error:", error);
            setError("Unable to load product");
        });
}

decreaseQuantity.addEventListener("click", () => {
    quantityInput.value = Math.max(1, (Number(quantityInput.value) || 1) - 1);
    updateQuantityButtons();
});

increaseQuantity.addEventListener("click", () => {
    const stock = Number(product?.stock) || 0;
    quantityInput.value = Math.min(stock, (Number(quantityInput.value) || 1) + 1);
    updateQuantityButtons();
});

quantityInput.addEventListener("input", updateQuantityButtons);

addButton.addEventListener("click", () => {
    if (!product) return;
    const stock = Number(product.stock) || 0;
    const quantity = Math.max(1, Math.min(stock, Number(quantityInput.value) || 1));
    if (quantity > stock || stock <= 0) return;

    addToCart(product, quantity);
    updateCartBadges();
    productMessage.textContent = "Added to cart. You can keep shopping or open your cart.";
    productMessage.className = "form-message success";
    showToast(`${product.name} added to cart.`, "success");
});

updateCartBadges();
