// ============================================================
// RESPawn PC Services
// STORE HELPERS
// ============================================================

const CART_KEY = "respawnStoreCart";


// ============================================================
// REAL DEMO PRODUCT IMAGES
// ============================================================
// These are used when a demo product still has an old
// placehold.co URL stored in Firestore.
// ============================================================

const demoImageMap = {

    demo_kingston_16gb_ram:
        "https://pcbox.vtexassets.com/arquivos/ids/1294104/KF432C16BB1-16_GAL_1.jpg?v=638372652021630000",

    demo_wd_sn580_1tb:
        "https://www.regard.ru/api/photo/goods/6138511.webp",

    demo_logitech_g502:
        "https://i.ebayimg.com/images/g/gG8AAOSw3rNoVy1v/s-l1200.jpg",

    demo_redragon_k552:
        "https://vivadigital.com.co/img/products/Teclado_Mecnico_KUMARA_K552_Redragon_Black/Teclado_Mecnico_KUMARA_K552_Redragon_Black16504023311.jpg",

    demo_tuf_24_monitor:
        "https://down-my.img.susercontent.com/file/my-11134207-7r991-ls0zvpih22p085",

    demo_deepcool_ag400:
        "https://images.kabum.com.br/produtos/fotos/sync_mirakl/446572/large/Air-Cooler-Deepcool-Gammaxx-Ag400-120mm-Intel-AMD-Preto-R-ag400-bknnmn-g-1_1759591116.jpg",

    demo_corsair_cv650:
        "https://images.tcdn.com.br/img/img_prod/1042771/fonte_corsair_cv650_650w_bivolt_80_plus_bronze_cp_9020236_br_1701_1_3ca5af75ea5188b502d3d229868dc147.jpg",

    demo_montech_air100:
        "https://down-ph.img.susercontent.com/file/ph-11134208-7qukz-lhpme227atc9e7",

    demo_arctic_p12:
        "https://product.hstatic.net/200000837185/product/p12_pwm_black-768x768-1_3fa1728591be4efb8b6ccbfc7565e029_master.jpg",

    demo_ugreen_dp:
        "https://img.telemart.ua/505143-643761/ugreen-dp102-displayport-to-displayport-4k-3d-12-3m-10212-black.png"

};


// ============================================================
// CART
// ============================================================

export function getCart() {

    try {

        const raw =
            localStorage.getItem(
                CART_KEY
            );


        const parsed =
            raw
                ? JSON.parse(raw)
                : [];


        return Array.isArray(parsed)
            ? parsed
            : [];


    } catch (error) {

        console.error(
            "Cart read error:",
            error
        );

        return [];
    }

}


export function saveCart(
    cart
) {

    localStorage.setItem(
        CART_KEY,
        JSON.stringify(cart)
    );

    updateCartBadges();

}


export function clearCart() {

    localStorage.removeItem(
        CART_KEY
    );

    updateCartBadges();

}


export function cartCount() {

    return getCart().reduce(
        (
            total,
            item
        ) =>

            total +
            Number(
                item.quantity || 0
            ),

        0
    );

}


export function cartTotal() {

    return getCart().reduce(
        (
            total,
            item
        ) =>

            total +

            (
                Number(
                    item.price || 0
                )

                *

                Number(
                    item.quantity || 0
                )
            ),

        0
    );

}


// ============================================================
// GET PRODUCT IMAGE
// ============================================================
//
// Priority:
//
// 1. Demo product with old placeholder -> real image
// 2. Existing real product URL -> use it
// 3. No image -> empty
//
// ============================================================

export function getProductImage(
    product
) {

    if (!product) {

        return "";

    }


    const id =
        String(
            product.id || ""
        );


    const currentImage =
        String(
            product.image || ""
        ).trim();


    if (

        demoImageMap[id]

        &&

        (
            !currentImage

            ||

            currentImage.includes(
                "placehold.co"
            )
        )

    ) {

        return demoImageMap[id];

    }


    if (currentImage) {

        return currentImage;

    }


    return "";

}


// ============================================================
// ADD TO CART
// ============================================================

export function addToCart(
    product,
    quantity = 1
) {

    const qty =
        Math.max(
            1,
            Number(
                quantity
            ) || 1
        );


    const cart =
        getCart();


    const existing =
        cart.find(
            (item) =>
                item.productId ===
                product.id
        );


    const realImage =
        getProductImage(
            product
        );


    if (existing) {

        existing.quantity +=
            qty;


        existing.price =
            Number(
                product.price
            ) || 0;


        existing.name =
            product.name ||
            existing.name;


        existing.image =
            realImage ||
            existing.image ||
            "";


        existing.category =
            product.category ||
            existing.category ||
            "Accessory";


        existing.stock =
            Number(
                product.stock
            ) || 0;


    } else {

        cart.push({

            productId:
                product.id,

            name:
                product.name ||
                "Product",

            price:
                Number(
                    product.price
                ) || 0,

            quantity:
                qty,

            image:
                realImage,

            category:
                product.category ||
                "Accessory",

            stock:
                Number(
                    product.stock
                ) || 0

        });

    }


    saveCart(
        cart
    );

}


// ============================================================
// CART QUANTITY
// ============================================================

export function setCartQuantity(
    productId,
    quantity
) {

    const cart =
        getCart();


    const item =
        cart.find(
            (entry) =>
                entry.productId ===
                productId
        );


    if (!item) {

        return;

    }


    item.quantity =
        Math.max(
            1,
            Number(
                quantity
            ) || 1
        );


    saveCart(
        cart
    );

}


// ============================================================
// REMOVE FROM CART
// ============================================================

export function removeFromCart(
    productId
) {

    saveCart(

        getCart().filter(
            (item) =>
                item.productId !==
                productId
        )

    );

}


// ============================================================
// CART BADGE
// ============================================================

export function updateCartBadges() {

    document
        .querySelectorAll(
            "[data-cart-count]"
        )
        .forEach(
            (badge) => {

                const count =
                    cartCount();


                badge.textContent =
                    count > 99
                        ? "99+"
                        : String(
                            count
                        );


                badge.hidden =
                    count === 0;

            }
        );

}


// ============================================================
// MONEY
// ============================================================

export function money(
    value
) {

    return new Intl.NumberFormat(
        "en-PH",
        {

            style:
                "currency",

            currency:
                "PHP",

            minimumFractionDigits:
                2

        }
    ).format(
        Number(
            value
        ) || 0
    );

}


// ============================================================
// ESCAPE TEXT
// ============================================================

export function escapeText(
    value
) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


// ============================================================
// PRODUCT ICONS
// ============================================================

export function productIcon(
    category = "Accessory"
) {

    const key =
        String(
            category
        ).toLowerCase();


    if (
        key.includes("memory")
        ||
        key.includes("ram")
    ) {

        return `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >

                <rect
                    x="3"
                    y="7"
                    width="18"
                    height="10"
                    rx="2"
                ></rect>

                <path
                    d="M7 7v-2M11 7v-2M15 7v-2M19 7v-2M7 17v2M11 17v2M15 17v2M19 17v2"
                ></path>

                <path
                    d="M7 10h2v4H7zM11 10h2v4h-2zM15 10h2v4h-2z"
                ></path>

            </svg>
        `;

    }


    if (
        key.includes("storage")
        ||
        key.includes("ssd")
    ) {

        return `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >

                <rect
                    x="5"
                    y="3"
                    width="14"
                    height="18"
                    rx="2"
                ></rect>

                <path
                    d="M8 7h8M8 11h8M8 15h5M8 18h3"
                ></path>

                <circle
                    cx="16"
                    cy="18"
                    r="1"
                ></circle>

            </svg>
        `;

    }


    if (
        key.includes("monitor")
    ) {

        return `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >

                <rect
                    x="3"
                    y="4"
                    width="18"
                    height="12"
                    rx="2"
                ></rect>

                <path
                    d="M9 20h6M12 16v4"
                ></path>

            </svg>
        `;

    }


    if (
        key.includes("keyboard")
    ) {

        return `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >

                <rect
                    x="2.5"
                    y="6"
                    width="19"
                    height="12"
                    rx="2"
                ></rect>

                <path
                    d="M6 10h.01M9 10h.01M12 10h.01M15 10h.01M18 10h.01M6 14h12"
                ></path>

            </svg>
        `;

    }


    if (
        key.includes("mouse")
    ) {

        return `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >

                <rect
                    x="7"
                    y="3"
                    width="10"
                    height="18"
                    rx="5"
                ></rect>

                <path
                    d="M12 3v7M9 8h6"
                ></path>

            </svg>
        `;

    }


    if (
        key.includes("power")
        ||
        key.includes("psu")
    ) {

        return `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >

                <rect
                    x="4"
                    y="4"
                    width="16"
                    height="16"
                    rx="2"
                ></rect>

                <path
                    d="M9 8v4M15 8v4M7 16h10"
                ></path>

            </svg>
        `;

    }


    if (
        key.includes("cooler")
        ||
        key.includes("fan")
    ) {

        return `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >

                <circle
                    cx="12"
                    cy="12"
                    r="8"
                ></circle>

                <circle
                    cx="12"
                    cy="12"
                    r="2"
                ></circle>

                <path
                    d="M12 10c0-3 3-4 4-2 1 2-1 3-4 4M14 12c3 0 4 3 2 4-2 1-3-1-4-4M12 14c0 3-3 4-4 2-1-2 1-3 4-4"
                ></path>

            </svg>
        `;

    }


    if (
        key.includes("case")
    ) {

        return `
            <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
            >

                <rect
                    x="6"
                    y="2.5"
                    width="12"
                    height="19"
                    rx="2"
                ></rect>

                <path
                    d="M9 6h6M9 17h6"
                ></path>

                <circle
                    cx="9"
                    cy="19"
                    r=".8"
                ></circle>

            </svg>
        `;

    }


    return `
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
        >

            <path
                d="M4 7.5h16v11H4z"
            ></path>

            <path
                d="M7 7.5V5h10v2.5M8 11h8M8 15h5"
            ></path>

        </svg>
    `;

}


// ============================================================
// PRODUCT VISUAL
// ============================================================

export function productVisual(
    product
) {

    const image =
        getProductImage(
            product
        );


    if (image) {

        return `
            <img
                src="${escapeText(image)}"
                alt="${escapeText(
                    product.name ||
                    "Product"
                )}"
                loading="lazy"
                referrerpolicy="no-referrer"
                onerror="
                    this.classList.add('image-failed');
                    this.nextElementSibling.hidden = false;
                "
            >

            <div
                class="store-product-art fallback-art"
                hidden
            >

                ${productIcon(
                    product.category
                )}

            </div>
        `;

    }


    return `
        <div
            class="store-product-art"
        >

            ${productIcon(
                product?.category
            )}

        </div>
    `;

}


// ============================================================
// STATUS
// ============================================================

export function statusLabel(
    status
) {

    return String(
        status ||
        "Pending"
    );

}


// ============================================================
// INITIAL BADGE
// ============================================================

updateCartBadges();