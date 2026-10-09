// ============================================================
// RESPawn PC Services
// CUSTOMER STORE
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";

import {
    addToCart,
    escapeText,
    money,
    productVisual,
    updateCartBadges
} from "./store-utils.js";

import {
    showToast
} from "./ui.js";


// ============================================================
// ELEMENTS
// ============================================================

const productsGrid =
    document.getElementById(
        "productsGrid"
    );

const storeLoading =
    document.getElementById(
        "storeLoading"
    );

const storeEmpty =
    document.getElementById(
        "storeEmpty"
    );

const storeNoInventory =
    document.getElementById(
        "storeNoInventory"
    );

const productCount =
    document.getElementById(
        "productCount"
    );

const searchInput =
    document.getElementById(
        "searchProducts"
    );

const categoryFilters =
    document.getElementById(
        "categoryFilters"
    );

const storeDashboardLink =
    document.getElementById(
        "storeDashboardLink"
    );

const storeAccountLink =
    document.getElementById(
        "storeAccountLink"
    );


// ============================================================
// DATA
// ============================================================

let products = [];

let activeCategory = "";


// ============================================================
// STOCK LABEL
// ============================================================

function stockLabel(
    stock
) {

    const value =
        Number(
            stock
        ) || 0;


    if (
        value <= 0
    ) {

        return "Out of stock";

    }


    if (
        value <= 3
    ) {

        return `Only ${value} left`;

    }


    return `${value} in stock`;

}


// ============================================================
// STOCK CLASS
// ============================================================

function stockClass(
    stock
) {

    const value =
        Number(
            stock
        ) || 0;


    if (
        value <= 0
    ) {

        return "out";

    }


    if (
        value <= 3
    ) {

        return "low";

    }


    return "good";

}


// ============================================================
// CATEGORY FILTERS
// ============================================================

function renderCategoryFilters() {

    const categories =
        [
            ...new Set(
                products
                    .map(
                        (product) =>
                            product.category
                    )
                    .filter(Boolean)
            )
        ]
        .sort();


    categoryFilters.innerHTML =
        `

            <button
                type="button"
                class="store-category-chip ${
                    activeCategory === ""
                        ? "active"
                        : ""
                }"
                data-category=""
            >
                All
            </button>

            ${categories
                .map(
                    (category) =>
                        `

                            <button
                                type="button"
                                class="store-category-chip ${
                                    activeCategory === category
                                        ? "active"
                                        : ""
                                }"
                                data-category="${escapeText(
                                    category
                                )}"
                            >
                                ${escapeText(
                                    category
                                )}
                            </button>

                        `
                )
                .join("")}

        `;

}


// ============================================================
// RENDER PRODUCTS
// ============================================================

function renderProducts() {

    const searchQuery =
        searchInput.value
            .trim()
            .toLowerCase();


    const filtered =
        products.filter(
            (product) => {

                const matchesCategory =
                    !activeCategory

                    ||

                    product.category ===
                        activeCategory;


                const haystack =
                    `
                        ${product.name || ""}
                        ${product.description || ""}
                        ${product.category || ""}
                    `
                    .toLowerCase();


                return (
                    matchesCategory
                    &&
                    haystack.includes(
                        searchQuery
                    )
                );

            }
        );


    productCount.textContent =
        `${filtered.length} product${
            filtered.length === 1
                ? ""
                : "s"
        }`;


    productsGrid.innerHTML =
        filtered
            .map(
                (product) => {

                    const stock =
                        Number(
                            product.stock
                        ) || 0;


                    return `

                        <article
                            class="store-product-card"
                        >

                            <a
                                href="/product.html?id=${encodeURIComponent(
                                    product.id
                                )}"
                                class="store-product-visual"
                            >

                                ${productVisual(
                                    product
                                )}

                                <span
                                    class="store-product-category"
                                >
                                    ${escapeText(
                                        product.category ||
                                        "Accessory"
                                    )}
                                </span>

                            </a>


                            <div
                                class="store-product-copy"
                            >

                                <div
                                    class="store-product-title-row"
                                >

                                    <h3>
                                        ${escapeText(
                                            product.name ||
                                            "Product"
                                        )}
                                    </h3>


                                    <span
                                        class="store-stock-dot ${stockClass(
                                            stock
                                        )}"
                                    ></span>

                                </div>


                                <p>
                                    ${escapeText(
                                        product.description ||
                                        "Gaming PC component or accessory."
                                    )}
                                </p>


                                <div
                                    class="store-product-meta"
                                >

                                    <strong>
                                        ${money(
                                            product.price
                                        )}
                                    </strong>


                                    <span>
                                        ${stockLabel(
                                            stock
                                        )}
                                    </span>

                                </div>


                                <div
                                    class="store-product-actions"
                                >

                                    <a
                                        href="/product.html?id=${encodeURIComponent(
                                            product.id
                                        )}"
                                        class="secondary-button"
                                    >
                                        Details
                                    </a>


                                    <button
                                        type="button"
                                        class="primary-button store-add-button"
                                        data-product-id="${escapeText(
                                            product.id
                                        )}"
                                        ${
                                            stock <= 0
                                                ? "disabled"
                                                : ""
                                        }
                                    >
                                        ${
                                            stock <= 0
                                                ? "Sold Out"
                                                : "Add to Cart"
                                        }
                                    </button>

                                </div>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");


    productsGrid.hidden =
        false;


    storeEmpty.hidden =
        filtered.length !== 0 ||
        products.length === 0;


    storeNoInventory.hidden =
        products.length !== 0;

}


// ============================================================
// CATEGORY CLICK
// ============================================================

categoryFilters.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                "[data-category]"
            );


        if (!button) {

            return;

        }


        activeCategory =
            button.dataset.category ||
            "";


        renderCategoryFilters();

        renderProducts();

    }
);


// ============================================================
// SEARCH
// ============================================================

searchInput.addEventListener(
    "input",
    renderProducts
);


// ============================================================
// ADD TO CART
// ============================================================

productsGrid.addEventListener(
    "click",
    (event) => {

        const button =
            event.target.closest(
                ".store-add-button"
            );


        if (!button) {

            return;

        }


        const product =
            products.find(
                (item) =>
                    item.id ===
                    button.dataset.productId
            );


        if (
            !product
            ||
            Number(product.stock) <= 0
        ) {

            return;

        }


        addToCart(
            product,
            1
        );


        updateCartBadges();


        showToast(
            `${product.name} added to cart.`,
            "success"
        );

    }
);


// ============================================================
// NAVBAR ACCOUNT
// ============================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!storeAccountLink) {

            return;

        }


        if (!user) {

            // Dashboard goes to login/customer flow.
            if (
                storeDashboardLink
            ) {

                storeDashboardLink.href =
                    "/dashboard.html";

            }


            storeAccountLink.textContent =
                "Login";


            storeAccountLink.href =
                "/login.html";


            storeAccountLink.onclick =
                null;


            return;

        }


        // ----------------------------------------------------
        // Signed in
        // ----------------------------------------------------

        storeAccountLink.textContent =
            "Logout";


        storeAccountLink.href =
            "#";


        storeAccountLink.onclick =
            async (event) => {

                event.preventDefault();


                storeAccountLink.style.pointerEvents =
                    "none";


                try {

                    await signOut(
                        auth
                    );


                    window.location.replace(
                        "/index.html"
                    );


                } catch (error) {

                    console.error(
                        "Store logout error:",
                        error
                    );


                    storeAccountLink.style.pointerEvents =
                        "";


                    showToast(
                        "Unable to log out. Please try again.",
                        "error"
                    );

                }

            };


        // ----------------------------------------------------
        // Check role so the Dashboard link goes directly
        // to the correct dashboard.
        // ----------------------------------------------------

        if (
            storeDashboardLink
        ) {

            try {

                const profile =
                    await getDoc(
                        doc(
                            db,
                            "users",
                            user.uid
                        )
                    );


                if (
                    profile.exists()
                    &&
                    profile.data().role ===
                        "admin"
                ) {

                    storeDashboardLink.href =
                        "/admin-dashboard.html";

                } else {

                    storeDashboardLink.href =
                        "/dashboard.html";

                }

            } catch (error) {

                console.error(
                    "Role lookup error:",
                    error
                );


                storeDashboardLink.href =
                    "/dashboard.html";

            }

        }

    }
);


// ============================================================
// LOAD PRODUCTS
// ============================================================

onSnapshot(

    collection(
        db,
        "products"
    ),

    (snapshot) => {

        products =
            snapshot.docs

                .map(
                    (docSnapshot) => ({

                        id:
                            docSnapshot.id,

                        ...docSnapshot.data()

                    })
                )

                .sort(
                    (a, b) =>
                        String(
                            a.name || ""
                        ).localeCompare(
                            String(
                                b.name || ""
                            )
                        )
                );


        storeLoading.hidden =
            true;


        renderCategoryFilters();

        renderProducts();

    },


    (error) => {

        console.error(
            "Store inventory error:",
            error
        );


        storeLoading.hidden =
            true;


        productsGrid.hidden =
            true;


        storeEmpty.hidden =
            true;


        storeNoInventory.hidden =
            false;


        productCount.textContent =
            "Unavailable";


        const errorTitle =
            storeNoInventory.querySelector(
                "h3"
            );


        const errorMessage =
            storeNoInventory.querySelector(
                "p"
            );


        if (errorTitle) {

            errorTitle.textContent =
                "Store inventory could not be loaded";

        }


        if (errorMessage) {

            errorMessage.textContent =
                "Please check your Firebase Firestore rules and refresh the page.";

        }

    }

);


// ============================================================
// CART BADGE
// ============================================================

updateCartBadges();