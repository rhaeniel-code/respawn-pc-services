// ============================================================
// RESPawn PC Services
// ADMIN STORE INVENTORY
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    setDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";

import {
    getProductImage
} from "./store-utils.js";

import {
    escapeHTML,
    formatPHP,
    setButtonLoading,
    showToast
} from "./ui.js";


// ============================================================
// ELEMENTS
// ============================================================

const logoutButton =
    document.getElementById(
        "logoutButton"
    );

const seedProductsButton =
    document.getElementById(
        "seedProductsButton"
    );

const productForm =
    document.getElementById(
        "productForm"
    );

const productId =
    document.getElementById(
        "productId"
    );

const productFormTitle =
    document.getElementById(
        "productFormTitle"
    );

const productFormName =
    document.getElementById(
        "productFormName"
    );

const productFormCategory =
    document.getElementById(
        "productFormCategory"
    );

const productFormDescription =
    document.getElementById(
        "productFormDescription"
    );

const productFormPrice =
    document.getElementById(
        "productFormPrice"
    );

const productFormStock =
    document.getElementById(
        "productFormStock"
    );

const productFormImage =
    document.getElementById(
        "productFormImage"
    );

const productFormMessage =
    document.getElementById(
        "productFormMessage"
    );

const saveProductButton =
    document.getElementById(
        "saveProductButton"
    );

const cancelEditButton =
    document.getElementById(
        "cancelEditButton"
    );

const inventoryList =
    document.getElementById(
        "inventoryList"
    );

const inventorySearch =
    document.getElementById(
        "inventorySearch"
    );

const inventoryCategoryFilter =
    document.getElementById(
        "inventoryCategoryFilter"
    );

const inventoryProductCount =
    document.getElementById(
        "inventoryProductCount"
    );

const inventoryUnitCount =
    document.getElementById(
        "inventoryUnitCount"
    );

const inventoryLowStockCount =
    document.getElementById(
        "inventoryLowStockCount"
    );

const inventoryOutStockCount =
    document.getElementById(
        "inventoryOutStockCount"
    );

const inventorySummary =
    document.getElementById(
        "inventorySummary"
    );


// ============================================================
// DEMO PRODUCTS
// ============================================================

const demoProducts = [

    {
        id:
            "demo_kingston_16gb_ram",

        name:
            "Kingston Fury Beast 16GB DDR4",

        category:
            "Memory",

        description:
            "16GB DDR4 gaming memory kit for everyday upgrades and gaming rigs.",

        price:
            1950,

        stock:
            12,

        image:
            "https://pcbox.vtexassets.com/arquivos/ids/1294104/KF432C16BB1-16_GAL_1.jpg?v=638372652021630000"

    },


    {
        id:
            "demo_wd_sn580_1tb",

        name:
            "WD Blue SN580 1TB NVMe SSD",

        category:
            "Storage",

        description:
            "Fast 1TB NVMe storage for game libraries, applications, and OS upgrades.",

        price:
            3999,

        stock:
            8,

        image:
            "https://www.regard.ru/api/photo/goods/6138511.webp"

    },


    {
        id:
            "demo_logitech_g502",

        name:
            "Logitech G502 Hero Gaming Mouse",

        category:
            "Mouse",

        description:
            "Wired gaming mouse with programmable buttons and adjustable sensitivity.",

        price:
            2450,

        stock:
            7,

        image:
            "https://i.ebayimg.com/images/g/gG8AAOSw3rNoVy1v/s-l1200.jpg"

    },


    {
        id:
            "demo_redragon_k552",

        name:
            "Redragon K552 Mechanical Keyboard",

        category:
            "Keyboard",

        description:
            "Compact mechanical keyboard for gaming desks and everyday productivity.",

        price:
            1690,

        stock:
            10,

        image:
            "https://vivadigital.com.co/img/products/Teclado_Mecnico_KUMARA_K552_Redragon_Black/Teclado_Mecnico_KUMARA_K552_Redragon_Black16504023311.jpg"

    },


    {
        id:
            "demo_tuf_24_monitor",

        name:
            "ASUS TUF Gaming 24-inch 180Hz Monitor",

        category:
            "Monitor",

        description:
            "High-refresh gaming monitor for smoother competitive play and fast motion.",

        price:
            8990,

        stock:
            5,

        image:
            "https://down-my.img.susercontent.com/file/my-11134207-7r991-ls0zvpih22p085"

    },


    {
        id:
            "demo_deepcool_ag400",

        name:
            "DeepCool AG400 CPU Cooler",

        category:
            "Cooler",

        description:
            "Tower-style air cooler designed for practical gaming PC temperature control.",

        price:
            1450,

        stock:
            9,

        image:
            "https://images.kabum.com.br/produtos/fotos/sync_mirakl/446572/large/Air-Cooler-Deepcool-Gammaxx-Ag400-120mm-Intel-AMD-Preto-R-ag400-bknnmn-g-1_1759591116.jpg"

    },


    {
        id:
            "demo_corsair_cv650",

        name:
            "Corsair CV650 650W Power Supply",

        category:
            "Power Supply",

        description:
            "650W power supply option for mainstream gaming and productivity systems.",

        price:
            3150,

        stock:
            6,

        image:
            "https://images.tcdn.com.br/img/img_prod/1042771/fonte_corsair_cv650_650w_bivolt_80_plus_bronze_cp_9020236_br_1701_1_3ca5af75ea5188b502d3d229868dc147.jpg"

    },


    {
        id:
            "demo_montech_air100",

        name:
            "Montech Air 100 Lite Case",

        category:
            "Case",

        description:
            "Compact gaming chassis with a clean layout for practical component builds.",

        price:
            2850,

        stock:
            4,

        image:
            "https://down-ph.img.susercontent.com/file/ph-11134208-7qukz-lhpme227atc9e7"

    },


    {
        id:
            "demo_arctic_p12",

        name:
            "Arctic P12 PWM 120mm Fan",

        category:
            "Fan",

        description:
            "120mm PWM case fan for improved airflow and quieter system cooling.",

        price:
            650,

        stock:
            20,

        image:
            "https://product.hstatic.net/200000837185/product/p12_pwm_black-768x768-1_3fa1728591be4efb8b6ccbfc7565e029_master.jpg"

    },


    {
        id:
            "demo_ugreen_dp",

        name:
            "UGREEN DisplayPort Cable",

        category:
            "Cable",

        description:
            "DisplayPort cable for connecting compatible GPUs, monitors, and gaming displays.",

        price:
            590,

        stock:
            25,

        image:
            "https://img.telemart.ua/505143-643761/ugreen-dp102-displayport-to-displayport-4k-3d-12-3m-10212-black.png"

    }

];


// ============================================================
// PRODUCTS
// ============================================================

let products = [];


// ============================================================
// CLEAR FORM
// ============================================================

function clearProductForm() {

    productId.value =
        "";

    productFormTitle.textContent =
        "Add Product";

    productForm.reset();

    productFormCategory.value =
        "Memory";

    cancelEditButton.hidden =
        true;

    productFormMessage.textContent =
        "";

    productFormMessage.className =
        "form-message";

}


// ============================================================
// EDIT PRODUCT
// ============================================================

function startEdit(
    product
) {

    productId.value =
        product.id;


    productFormTitle.textContent =
        "Edit Product";


    productFormName.value =
        product.name || "";


    productFormCategory.value =
        product.category ||
        "Accessory";


    productFormDescription.value =
        product.description || "";


    productFormPrice.value =
        Number(
            product.price
        ) || 0;


    productFormStock.value =
        Number(
            product.stock
        ) || 0;


    // Use the REAL image URL even if Firestore
    // still contains the old placeholder.

    productFormImage.value =
        getProductImage(
            product
        );


    cancelEditButton.hidden =
        false;


    window.scrollTo({

        top:
            0,

        behavior:
            "smooth"

    });

}


// ============================================================
// FILTERS
// ============================================================

function renderFilters() {

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


    const current =
        inventoryCategoryFilter.value;


    inventoryCategoryFilter.innerHTML =
        `

            <option value="">
                All categories
            </option>

            ${categories
                .map(
                    (category) =>
                        `

                            <option
                                value="${escapeHTML(
                                    category
                                )}"
                            >
                                ${escapeHTML(
                                    category
                                )}
                            </option>

                        `
                )
                .join("")}

        `;


    if (
        categories.includes(
            current
        )
    ) {

        inventoryCategoryFilter.value =
            current;

    }

}


// ============================================================
// INVENTORY
// ============================================================

function renderInventory() {

    const queryText =
        inventorySearch.value
            .trim()
            .toLowerCase();


    const selectedCategory =
        inventoryCategoryFilter.value;


    const filtered =
        products.filter(
            (product) => {

                const haystack =
                    `
                        ${product.name || ""}
                        ${product.description || ""}
                        ${product.category || ""}
                    `
                    .toLowerCase();


                return (

                    haystack.includes(
                        queryText
                    )

                    &&

                    (
                        !selectedCategory
                        ||
                        product.category ===
                            selectedCategory
                    )

                );

            }
        );


    const totalUnits =
        products.reduce(
            (
                sum,
                product
            ) =>
                sum +
                (
                    Number(
                        product.stock
                    ) || 0
                ),
            0
        );


    const lowStock =
        products.filter(
            (product) =>

                Number(
                    product.stock
                ) > 0

                &&

                Number(
                    product.stock
                ) <= 3
                ).length;


    const outOfStock =
        products.filter(
            (product) =>
                Number(
                    product.stock
                ) <= 0
        ).length;


    inventoryProductCount.textContent =
        String(
            products.length
        );


    inventoryUnitCount.textContent =
        String(
            totalUnits
        );


    inventoryLowStockCount.textContent =
        String(
            lowStock
        );


    inventoryOutStockCount.textContent =
        String(
            outOfStock
        );


    inventorySummary.textContent =
        `${filtered.length} product${
            filtered.length === 1
                ? ""
                : "s"
        }`;


    inventoryList.innerHTML =
        filtered
            .map(
                (product) => {

                    const stock =
                        Number(
                            product.stock
                        ) || 0;


                    const stockClass =
                        stock <= 0
                            ? "out"
                            :
                        stock <= 3
                            ? "low"
                            :
                        "good";


                    // IMPORTANT:
                    // This resolves the real image
                    // instead of directly using product.image.

                    const image =
                        getProductImage(
                            product
                        );


                    return `

                        <article
                            class="store-admin-product-row"
                        >

                            <div
                                class="store-admin-product-main"
                            >

                                <div
                                    class="store-admin-product-thumb"
                                >

                                    ${
                                        image

                                            ?

                                        `
                                            <img
                                                src="${escapeHTML(
                                                    image
                                                )}"
                                                alt="${escapeHTML(
                                                    product.name ||
                                                    "Product"
                                                )}"
                                                loading="lazy"
                                                referrerpolicy="no-referrer"
                                                onerror="this.style.display='none';"
                                            >
                                        `

                                            :

                                        "PC"
                                    }

                                </div>


                                <div>

                                    <p
                                        class="store-product-category"
                                    >
                                        ${escapeHTML(
                                            product.category ||
                                            "Accessory"
                                        )}
                                    </p>


                                    <h3>
                                        ${escapeHTML(
                                            product.name ||
                                            "Product"
                                        )}
                                    </h3>


                                    <p>
                                        ${escapeHTML(
                                            product.description ||
                                            ""
                                        )}
                                    </p>

                                </div>

                            </div>


                            <div
                                class="store-admin-product-metrics"
                            >

                                <div>

                                    <span>
                                        PRICE
                                    </span>

                                    <strong>
                                        ${formatPHP(
                                            product.price
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        STOCK
                                    </span>

                                    <strong
                                        class="store-stock-text ${stockClass}"
                                    >
                                        ${stock}
                                    </strong>

                                </div>

                            </div>


                            <div
                                class="store-admin-row-actions"
                            >

                                <button
                                    type="button"
                                    class="secondary-button"
                                    data-edit="${escapeHTML(
                                        product.id
                                    )}"
                                >
                                    Edit
                                </button>


                                <button
                                    type="button"
                                    class="secondary-button danger-outline"
                                    data-delete="${escapeHTML(
                                        product.id
                                    )}"
                                >
                                    Delete
                                </button>

                            </div>

                        </article>

                    `;

                }
            )
            .join("")

        ||

        `

            <div
                class="store-empty compact-store-empty"
            >

                <div
                    class="store-empty-icon"
                >
                    0
                </div>


                <h3>
                    No matching products
                </h3>


                <p>
                    Adjust your search or category filter.
                </p>

            </div>

        `;

}


// ============================================================
// ADMIN CHECK
// ============================================================

async function guardAdmin(
    user
) {

    if (!user) {

        window.location.replace(
            "/login.html"
        );

        return false;

    }


    const profile =
        await getDoc(
            doc(
                db,
                "users",
                user.uid
            )
        );


    if (
        !profile.exists()

        ||

        profile.data().role !==
            "admin"
    ) {

        window.location.replace(
            "/dashboard.html"
        );

        return false;

    }


    return true;

}


// ============================================================
// SAVE PRODUCT
// ============================================================

productForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        productFormMessage.textContent =
            "";

        productFormMessage.className =
            "form-message";


        setButtonLoading(
            saveProductButton,
            true,
            "Saving...",
            "Save Product"
        );


        try {

            const existingId =
                productId.value.trim();


            const productRef =
                existingId

                    ?

                doc(
                    db,
                    "products",
                    existingId
                )

                    :

                doc(
                    collection(
                        db,
                        "products"
                    )
                );


            const payload = {

                name:
                    productFormName.value
                        .trim(),

                category:
                    productFormCategory.value,

                description:
                    productFormDescription.value
                        .trim(),

                price:
                    Number(
                        productFormPrice.value
                    ) || 0,

                stock:
                    Math.max(
                        0,
                        Number(
                            productFormStock.value
                        ) || 0
                    ),

                image:
                    productFormImage.value
                        .trim(),

                updatedAt:
                    new Date()

            };


            if (

                !payload.name

                ||

                !payload.description

                ||

                payload.price < 0

            ) {

                throw new Error(
                    "Please complete the product form."
                );

            }


            if (
                existingId
            ) {

                await updateDoc(
                    productRef,
                    payload
                );


                showToast(
                    "Product updated.",
                    "success"
                );


            } else {

                await setDoc(
                    productRef,
                    {

                        ...payload,

                        createdAt:
                            new Date()

                    }
                );


                showToast(
                    "Product added.",
                    "success"
                );

            }


            clearProductForm();


        } catch (error) {

            console.error(
                "Product save error:",
                error
            );


            productFormMessage.textContent =
                error.message

                ||

                "The product could not be saved.";


            productFormMessage.className =
                "form-message error";


        } finally {

            setButtonLoading(
                saveProductButton,
                false,
                "Saving...",
                "Save Product"
            );

        }

    }
);


// ============================================================
// CANCEL EDIT
// ============================================================

cancelEditButton.addEventListener(
    "click",
    clearProductForm
);


// ============================================================
// EDIT / DELETE
// ============================================================

inventoryList.addEventListener(
    "click",
    async (event) => {

        const editButton =
            event.target.closest(
                "[data-edit]"
            );


        const deleteButton =
            event.target.closest(
                "[data-delete]"
            );


        if (editButton) {

            const product =
                products.find(
                    (item) =>
                        item.id ===
                        editButton.dataset.edit
                );


            if (product) {

                startEdit(
                    product
                );

            }


            return;

        }


        if (deleteButton) {

            const product =
                products.find(
                    (item) =>
                        item.id ===
                        deleteButton.dataset.delete
                );


            if (!product) {

                return;

            }


            const confirmed =
                window.confirm(
                    `Delete ${product.name}? This removes it from the store catalog.`
                );


            if (!confirmed) {

                return;

            }


            try {

                await deleteDoc(
                    doc(
                        db,
                        "products",
                        product.id
                    )
                );


                showToast(
                    "Product deleted.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Product delete error:",
                    error
                );


                showToast(
                    "Product could not be deleted.",
                    "error"
                );

            }

        }

    }
);


// ============================================================
// LOAD / UPDATE DEMO PRODUCTS
// ============================================================
//
// This does NOT delete your custom product.
//
// Existing demo products:
// only their image gets updated.
//
// Missing demo products:
// they are created normally.
//
// ============================================================

seedProductsButton.addEventListener(
    "click",
    async () => {

        setButtonLoading(
            seedProductsButton,
            true,
            "Updating...",
            "Load Demo Products"
        );


        try {

            let addedCount =
                0;


            let updatedImageCount =
                0;


            for (
                const product
                of demoProducts
            ) {

                const productRef =
                    doc(
                        db,
                        "products",
                        product.id
                    );


                const existing =
                    await getDoc(
                        productRef
                    );


                if (
                    existing.exists()
                ) {

                    const existingData =
                        existing.data();


                    if (
                        existingData.image
                        !==
                        product.image
                    ) {

                        await updateDoc(
                            productRef,
                            {

                                image:
                                    product.image,

                                updatedAt:
                                    new Date()

                            }
                        );


                        updatedImageCount++;

                    }


                } else {

                    await setDoc(
                        productRef,
                        {

                            ...product,

                            createdAt:
                                new Date(),

                            updatedAt:
                                new Date()

                        }
                    );


                    addedCount++;

                }

            }


            showToast(
                `${addedCount} demo product${
                    addedCount === 1
                        ? ""
                        : "s"
                } added and ${updatedImageCount} image${
                    updatedImageCount === 1
                        ? ""
                        : "s"
                } updated.`,
                "success"
            );


        } catch (error) {

            console.error(
                "Demo products error:",
                error
            );


            showToast(
                "Demo products could not be updated.",
                "error"
            );


        } finally {

            setButtonLoading(
                seedProductsButton,
                false,
                "Updating...",
                "Load Demo Products"
            );

        }

    }
);


// ============================================================
// SEARCH
// ============================================================

inventorySearch.addEventListener(
    "input",
    renderInventory
);


// ============================================================
// CATEGORY FILTER
// ============================================================

inventoryCategoryFilter.addEventListener(
    "change",
    renderInventory
);


// ============================================================
// LOGOUT
// ============================================================

logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );


            window.location.replace(
                "/index.html"
            );


        } catch (error) {

            console.error(
                "Logout error:",
                error
            );


            showToast(
                "Unable to log out. Please try again.",
                "error"
            );

        }

    }
);


// ============================================================
// AUTH + INVENTORY
// ============================================================

onAuthStateChanged(
    auth,
    async (user) => {

        try {

            const allowed =
                await guardAdmin(
                    user
                );


            if (!allowed) {

                return;

            }


            onSnapshot(

                query(
                    collection(
                        db,
                        "products"
                    ),

                    orderBy(
                        "name"
                    )
                ),


                (snapshot) => {

                    products =
                        snapshot.docs.map(
                            (
                                snapshotDoc
                            ) => ({

                                id:
                                    snapshotDoc.id,

                                ...snapshotDoc.data()

                            })
                        );


                    renderFilters();

                    renderInventory();


                    // Keep button available.

                    seedProductsButton.disabled =
                        false;

                },


                (error) => {

                    console.error(
                        "Inventory snapshot error:",
                        error
                    );


                    showToast(
                        "Inventory could not be loaded.",
                        "error"
                    );

                }

            );

        } catch (error) {

            console.error(
                "Admin guard error:",
                error
            );


            window.location.replace(
                "/dashboard.html"
            );

        }

    }
);


// ============================================================
// INITIAL FORM
// ============================================================

clearProductForm();