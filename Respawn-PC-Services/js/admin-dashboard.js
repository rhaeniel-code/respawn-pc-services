// ============================================================
// RESPawn PC Services
// ADMIN DASHBOARD
// Real-time bookings/customers + filters + payments
// Revenue totals intentionally excluded.
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
    runTransaction,
    serverTimestamp,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";

import {
    getServicePrice
} from "./pricing.js";

import {
    escapeHTML,
    formatDate,
    formatPHP,
    formatTime,
    formatTimestamp,
    showToast,
    statusClass,
    setButtonLoading
} from "./ui.js";


const totalCustomers =
    document.getElementById(
        "totalCustomers"
    );


const totalBookings =
    document.getElementById(
        "totalBookings"
    );


const pendingBookings =
    document.getElementById(
        "pendingBookings"
    );


const confirmedBookings =
    document.getElementById(
        "confirmedBookings"
    );


const completedBookings =
    document.getElementById(
        "completedBookings"
    );


const cancelledBookings =
    document.getElementById(
        "cancelledBookings"
    );


const paidBookings =
    document.getElementById(
        "paidBookings"
    );


const unpaidActiveBookings =
    document.getElementById(
        "unpaidActiveBookings"
    );


const todayDropOffs =
    document.getElementById(
        "todayDropOffs"
    );


const todayDropOffDescription =
    document.getElementById(
        "todayDropOffDescription"
    );


const upcomingPickups =
    document.getElementById(
        "upcomingPickups"
    );


const activeBookings =
    document.getElementById(
        "activeBookings"
    );


const todaySchedule =
    document.getElementById(
        "todaySchedule"
    );


const todayScheduleCount =
    document.getElementById(
        "todayScheduleCount"
    );


const recentBookings =
    document.getElementById(
        "recentBookings"
    );


const adminBookingsList =
    document.getElementById(
        "adminBookingsList"
    );


const bookingCount =
    document.getElementById(
        "bookingCount"
    );


const adminLoading =
    document.getElementById(
        "adminLoading"
    );


const customersList =
    document.getElementById(
        "customersList"
    );


const customerCount =
    document.getElementById(
        "customerCount"
    );


const paymentsList =
    document.getElementById(
        "paymentsList"
    );


const paymentCount =
    document.getElementById(
        "paymentCount"
    );


const statusReport =
    document.getElementById(
        "statusReport"
    );


const serviceReport =
    document.getElementById(
        "serviceReport"
    );


const paymentMethodReport =
    document.getElementById(
        "paymentMethodReport"
    );


const refreshButton =
    document.getElementById(
        "refreshButton"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const paymentModal =
    document.getElementById(
        "paymentModal"
    );


const closePaymentModal =
    document.getElementById(
        "closePaymentModal"
    );


const cancelPayment =
    document.getElementById(
        "cancelPayment"
    );


const paymentForm =
    document.getElementById(
        "paymentForm"
    );


const paymentCustomer =
    document.getElementById(
        "paymentCustomer"
    );


const paymentService =
    document.getElementById(
        "paymentService"
    );


const paymentBookingId =
    document.getElementById(
        "paymentBookingId"
    );


const paymentAmount =
    document.getElementById(
        "paymentAmount"
    );


const paymentMethod =
    document.getElementById(
        "paymentMethod"
    );


const paymentMessage =
    document.getElementById(
        "paymentMessage"
    );


const savePayment =
    document.getElementById(
        "savePayment"
    );


const bookingSearch =
    document.getElementById(
        "bookingSearch"
    );


const statusFilter =
    document.getElementById(
        "statusFilter"
    );


const serviceFilter =
    document.getElementById(
        "serviceFilter"
    );


const clearFilters =
    document.getElementById(
        "clearFilters"
    );


let allBookings =
    [];


let allUsers =
    [];


let selectedPaymentBooking =
    null;


let unsubscribeBookings =
    null;


let unsubscribeUsers =
    null;


let initialized =
    false;


function bookingTimeValue(
    booking
) {

    if (
        booking.appointmentAt?.seconds
    ) {

        return (
            booking.appointmentAt.seconds *
            1000
        );

    }


    if (
        booking.date &&
        booking.time
    ) {

        return new Date(
            `${booking.date}T${booking.time}:00+08:00`
        ).getTime();

    }


    return 0;

}


function createdValue(
    booking
) {

    if (
        booking.createdAt?.seconds
    ) {

        return (
            booking.createdAt.seconds *
            1000
        );

    }


    return bookingTimeValue(
        booking
    );

}


function isActive(
    booking
) {

    return (
        booking.status ===
        "Pending" ||
        booking.status ===
        "Confirmed"
    );

}


function todayPH() {

    return new Intl.DateTimeFormat(
        "en-CA",
        {

            timeZone:
                "Asia/Manila",

            year:
                "numeric",

            month:
                "2-digit",

            day:
                "2-digit"

        }
    ).format(
        new Date()
    );

}


function statusActionButtons(
    booking
) {

    if (
        booking.status ===
        "Pending"
    ) {

        return `

            <button
                class="admin-action primary"
                data-action="confirm"
                data-id="${booking.id}"
            >
                Confirm
            </button>

            <button
                class="admin-action danger"
                data-action="cancel"
                data-id="${booking.id}"
            >
                Cancel
            </button>

        `;

    }


    if (
        booking.status ===
        "Confirmed"
    ) {

        return `

            <button
                class="admin-action primary"
                data-action="complete"
                data-id="${booking.id}"
            >
                Complete
            </button>

            <button
                class="admin-action danger"
                data-action="cancel"
                data-id="${booking.id}"
            >
                Cancel
            </button>

        `;

    }


    return `

        <span class="admin-locked-status">
            ${
                booking.status ===
                "Completed"
                    ? "Completed"
                    : "Closed"
            }
        </span>

    `;

}


function paymentButton(
    booking
) {

    // Payment state is shown in the details grid.
    // The action button itself is placed in the action row below
    // so it stays easy to find and does not get lost in the grid.

    if (
        booking.payment?.status ===
        "Paid"
    ) {

        return `

            <div class="booking-payment-state paid">

                <span>
                    PAID
                </span>

                <strong>
                    ${escapeHTML(
                        formatPHP(
                            booking.payment.amount
                        )
                    )}
                </strong>

                <small>
                    ${escapeHTML(
                        booking.payment.method ||
                        "Payment recorded"
                    )}
                </small>

            </div>

        `;

    }


    if (
        booking.status ===
        "Cancelled"
    ) {

        return `

            <div class="booking-payment-state muted">

                <span>
                    UNPAID
                </span>

                <small>
                    Cancelled booking
                </small>

            </div>

        `;

    }


    return `

        <div class="booking-payment-state muted">

            <span>
                UNPAID
            </span>

            <small>
                Awaiting payment
            </small>

        </div>

    `;

}


function renderOverview() {

    const statusCount =
        (name) =>
            allBookings.filter(
                (booking) =>
                    booking.status ===
                    name
            ).length;


    const paid =
        allBookings.filter(
            (booking) =>
                booking.payment?.status ===
                "Paid"
        ).length;


    const active =
        allBookings.filter(
            isActive
        );


    const unpaidActive =
        active.filter(
            (booking) =>
                booking.payment?.status !==
                "Paid"
        ).length;


    const today =
        todayPH();


    const todayList =
        allBookings
            .filter(
                (booking) =>
                    booking.date ===
                    today &&
                    isActive(
                        booking
                    )
            )
            .sort(
                (a, b) =>
                    (
                        a.time ||
                        ""
                    ).localeCompare(
                        b.time ||
                        ""
                    )
            );


    const upcomingPickupList =
        allBookings
            .filter(
                (booking) =>
                    isActive(
                        booking
                    ) &&
                    booking.pickupDate >=
                    today
            )
            .sort(
                (a, b) =>
                    (
                        a.pickupDate ||
                        ""
                    ).localeCompare(
                        b.pickupDate ||
                        ""
                    )
            );


    totalCustomers.textContent =
        allUsers.filter(
            (user) =>
                user.role !==
                "admin"
        ).length;


    totalBookings.textContent =
        allBookings.length;


    pendingBookings.textContent =
        statusCount(
            "Pending"
        );


    confirmedBookings.textContent =
        statusCount(
            "Confirmed"
        );


    completedBookings.textContent =
        statusCount(
            "Completed"
        );


    cancelledBookings.textContent =
        statusCount(
            "Cancelled"
        );


    paidBookings.textContent =
        paid;


    unpaidActiveBookings.textContent =
        unpaidActive;


    activeBookings.textContent =
        active.length;


    todayDropOffs.textContent =
        todayList.length;


    todayDropOffDescription.textContent =

        todayList.length

            ? `${todayList
                .map(
                    (booking) =>
                        booking.time
                            ? formatTime(
                                booking.time
                            )
                            : "—"
                )
                .join(
                    " · "
                )} today.`

            : "No drop-offs scheduled today.";


    upcomingPickups.textContent =
        upcomingPickupList.length;


    todayScheduleCount.textContent =
        `${todayList.length} appointment${
            todayList.length ===
            1
                ? ""
                : "s"
        }`;


    renderTodaySchedule(
        todayList
    );


    renderReports();

}


function renderTodaySchedule(
    todayList
) {

    todaySchedule.innerHTML =
        "";


    if (
        !todayList.length
    ) {

        todaySchedule.innerHTML = `

            <div class="empty-inline">

                <strong>
                    No appointments today.
                </strong>

                <span>
                    New bookings will appear
                    here automatically.
                </span>

            </div>

        `;


        return;

    }


    todayList.forEach(
        (booking) => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "today-schedule-row";


            card.innerHTML = `

                <div class="schedule-time">

                    <strong>
                        ${escapeHTML(
                            formatTime(
                                booking.time
                            )
                        )}
                    </strong>

                    <span>
                        DROP-OFF
                    </span>

                </div>


                <div class="schedule-customer">

                    <strong>
                        ${escapeHTML(
                            booking.customerName ||
                            "Customer"
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            booking.service ||
                            "PC Service"
                        )}
                    </span>

                </div>


                <span class="${statusClass(
                    booking.status
                )}">

                    ${escapeHTML(
                        booking.status
                    )}

                </span>


                <a
                    href="/booking-details.html?bookingId=${encodeURIComponent(
                        booking.id
                    )}"
                    class="secondary-button small-button"
                >
                    Details
                </a>

            `;


            todaySchedule.appendChild(
                card
            );

        }
    );

}


function renderRecentBookings() {

    const items =
        [
            ...allBookings
        ]
            .sort(
                (a, b) =>
                    createdValue(
                        b
                    ) -
                    createdValue(
                        a
                    )
            )
            .slice(
                0,
                6
            );


    recentBookings.innerHTML =
        "";


    if (
        !items.length
    ) {

        recentBookings.innerHTML = `

            <div class="empty-inline">

                <strong>
                    No booking activity yet.
                </strong>

                <span>
                    Customer requests will appear here.
                </span>

            </div>

        `;


        return;

    }


    items.forEach(
        (booking) => {

            const item =
                document.createElement(
                    "a"
                );


            item.className =
                "recent-booking-row";


            item.href =
                `/booking-details.html?bookingId=${
                    encodeURIComponent(
                        booking.id
                    )
                }`;


            item.innerHTML = `

                <span class="recent-marker"></span>


                <div>

                    <strong>
                        ${escapeHTML(
                            booking.customerName ||
                            "Customer"
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            booking.service ||
                            "PC Service"
                        )}

                        ·

                        ${escapeHTML(
                            booking.date ||
                            "No date"
                        )}

                    </span>

                </div>


                <span class="${statusClass(
                    booking.status
                )}">

                    ${escapeHTML(
                        booking.status
                    )}

                </span>

            `;


            recentBookings.appendChild(
                item
            );

        }
    );

}


function getFilteredBookings() {

    const search =
        bookingSearch.value
            .trim()
            .toLowerCase();


    const status =
        statusFilter.value;


    const service =
        serviceFilter.value;


    return allBookings
        .filter(
            (booking) => {

                const haystack =
                    `${booking.customerName || ""} ${
                        booking.email || ""
                    } ${
                        booking.service || ""
                    }`.toLowerCase();


                const searchMatches =
                    !search ||
                    haystack.includes(
                        search
                    );


                const statusMatches =
                    status === "All" ||
                    booking.status ===
                    status;


                const serviceMatches =
                    service === "All" ||
                    booking.service ===
                    service;


                return (
                    searchMatches &&
                    statusMatches &&
                    serviceMatches
                );

            }
        )
        .sort(
            (a, b) =>
                bookingTimeValue(
                    a
                ) -
                bookingTimeValue(
                    b
                )
        );

}


function renderBookings() {

    const bookings =
        getFilteredBookings();


    bookingCount.textContent =
        `${bookings.length} matching`;


    adminBookingsList.innerHTML =
        "";


    if (
        !bookings.length
    ) {

        adminBookingsList.innerHTML = `

            <div class="empty-inline">

                <strong>
                    No bookings match these filters.
                </strong>

                <span>
                    Try clearing one or more filters.
                </span>

            </div>

        `;


        return;

    }


    bookings.forEach(
        (booking) => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "admin-booking-card";


            const isPaid =
                booking.payment?.status ===
                "Paid";


            card.innerHTML = `

                <div class="admin-booking-main">

                    <div class="admin-booking-title-row">

                        <div>

                            <p class="card-eyebrow">

                                ${
                                    booking.status ===
                                    "Pending"
                                        ? "NEW REQUEST"
                                        : "BOOKING"
                                }

                            </p>

                            <h3>
                                ${escapeHTML(
                                    booking.customerName ||
                                    "Customer"
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    booking.email ||
                                    "No email"
                                )}
                            </p>

                        </div>


                        <span class="${statusClass(
                            booking.status
                        )}">

                            ${escapeHTML(
                                booking.status ||
                                "Pending"
                            )}

                        </span>

                    </div>


                    <div class="admin-booking-grid">


                        <div>

                            <span>
                                SERVICE
                            </span>

                            <strong>
                                ${escapeHTML(
                                    booking.service ||
                                    "PC Service"
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                DROP-OFF
                            </span>

                            <strong>

                                ${escapeHTML(
                                    formatDate(
                                        booking.date,
                                        {
                                            weekday:
                                                "short"
                                        }
                                    )
                                )}

                                ·

                                ${escapeHTML(
                                    formatTime(
                                        booking.time
                                    )
                                )}

                            </strong>

                        </div>


                        <div>

                            <span>
                                PICKUP
                            </span>

                            <strong>
                                ${escapeHTML(
                                    formatDate(
                                        booking.pickupDate,
                                        {
                                            weekday:
                                                "short"
                                        }
                                    )
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                PAYMENT
                            </span>

                            ${paymentButton(
                                booking
                            )}

                        </div>

                    </div>


                    <div class="admin-issue">

                        <span>
                            ISSUE
                        </span>

                        <p>
                            ${escapeHTML(
                                booking.description ||
                                "No issue description provided."
                            )}
                        </p>

                    </div>

                </div>


                <div class="admin-booking-actions">

                    <a
                        href="/booking-details.html?bookingId=${encodeURIComponent(
                            booking.id
                        )}"
                        class="secondary-button"
                    >
                        View Details
                    </a>


                    <div class="admin-status-actions">

                        ${statusActionButtons(
                            booking
                        )}

                    </div>


                    ${
                        !isPaid && booking.status !== "Cancelled"
                            ? `
                                <button
                                    type="button"
                                    class="payment-record-button admin-payment-action"
                                    data-action="payment"
                                    data-id="${escapeHTML(booking.id)}"
                                >
                                    Record Payment
                                </button>
                              `
                            : ""
                    }


                    ${
                        isPaid
                            ? `
                                <a
                                    href="/receipt.html?bookingId=${encodeURIComponent(
                                        booking.id
                                    )}"
                                    class="admin-receipt-link admin-payment-action-link"
                                >
                                    View Receipt
                                    <span>${escapeHTML(
                                        booking.payment.receiptNumber || ""
                                    )}</span>
                                </a>
                              `
                            : ""
                    }

                </div>

            `;


            adminBookingsList.appendChild(
                card
            );

        }
    );

}


function renderCustomers() {

    const customers =
        allUsers
            .filter(
                (user) =>
                    user.role !==
                    "admin"
            )
            .sort(
                (a, b) =>
                    (
                        a.fullName ||
                        ""
                    ).localeCompare(
                        b.fullName ||
                        ""
                    )
            );


    customerCount.textContent =
        `${customers.length} customer${
            customers.length ===
            1
                ? ""
                : "s"
        }`;


    customersList.innerHTML =
        "";


    if (
        !customers.length
    ) {

        customersList.innerHTML = `

            <div class="empty-inline">

                <strong>
                    No customer accounts yet.
                </strong>

            </div>

        `;


        return;

    }


    customers.forEach(
        (user) => {

            const customerBookings =
                allBookings.filter(
                    (booking) =>
                        booking.userId ===
                        user.uid
                );


            const active =
                customerBookings.some(
                    isActive
                );


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "customer-admin-card";


            row.innerHTML = `

                <div class="customer-avatar">

                    ${escapeHTML(
                        (
                            user.fullName ||
                            "C"
                        )
                            .charAt(
                                0
                            )
                            .toUpperCase()
                    )}

                </div>


                <div>

                    <strong>
                        ${escapeHTML(
                            user.fullName ||
                            "Customer"
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            user.email ||
                            "No email"
                        )}
                    </span>

                </div>


                <div class="customer-booking-summary">

                    <strong>
                        ${customerBookings.length}
                    </strong>

                    <span>
                        bookings
                    </span>

                </div>


                <span
                    class="customer-active-state ${
                        active
                            ? "is-active"
                            : ""
                    }"
                >

                    ${
                        active
                            ? "ACTIVE"
                            : "NO ACTIVE"
                    }

                </span>

            `;


            customersList.appendChild(
                row
            );

        }
    );

}


function renderPayments() {

    const payments =
        allBookings
            .filter(
                (booking) =>
                    booking.payment?.status ===
                    "Paid"
            )
            .sort(
                (a, b) =>
                    createdValue(
                        b
                    ) -
                    createdValue(
                        a
                    )
            );


    paymentCount.textContent =
        `${payments.length} paid`;


    paymentsList.innerHTML =
        "";


    if (
        !payments.length
    ) {

        paymentsList.innerHTML = `

            <div class="empty-inline">

                <strong>
                    No payments recorded.
                </strong>

                <span>
                    Recorded payments will appear here.
                </span>

            </div>

        `;


        return;

    }


    payments.forEach(
        (booking) => {

            const payment =
                booking.payment;


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "payment-admin-card";


            card.innerHTML = `

                <div>

                    <p class="card-eyebrow">
                        ${escapeHTML(
                            payment.method ||
                            "Payment"
                        )}
                    </p>


                    <h3>
                        ${escapeHTML(
                            booking.customerName ||
                            "Customer"
                        )}
                    </h3>


                    <span>
                        ${escapeHTML(
                            booking.service ||
                            "PC Service"
                        )}
                    </span>

                </div>


                <div class="payment-admin-amount">

                    <strong>
                        ${escapeHTML(
                            formatPHP(
                                payment.amount
                            )
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            formatTimestamp(
                                payment.paidAt
                            )
                        )}
                    </span>

                </div>


                <div class="payment-admin-actions">

                    <span class="payment-paid">
                        PAID
                    </span>


                    <span>
                        ${escapeHTML(
                            payment.receiptNumber ||
                            "No receipt"
                        )}
                    </span>


                    <a
                        href="/receipt.html?bookingId=${encodeURIComponent(
                            booking.id
                        )}"
                        class="secondary-button small-button"
                    >
                        Receipt
                    </a>

                </div>

            `;


            paymentsList.appendChild(
                card
            );

        }
    );

}


function renderReports() {

    const counts =
        {

            Pending:
                0,

            Confirmed:
                0,

            Completed:
                0,

            Cancelled:
                0

        };


    allBookings.forEach(
        (booking) => {

            counts[
                booking.status
            ] =
                (
                    counts[
                        booking.status
                    ] ||
                    0
                ) +
                1;

        }
    );


    statusReport.innerHTML =
        Object.entries(
            counts
        )
            .map(
                (
                    [
                        name,
                        count
                    ]
                ) => `

                    <div class="report-row">

                        <span>
                            ${escapeHTML(
                                name
                            )}
                        </span>

                        <strong>
                            ${count}
                        </strong>

                    </div>

                `
            )
            .join(
                ""
            );


    const services =
        {};


    allBookings.forEach(
        (booking) => {

            const service =
                booking.service ||
                "Unknown";


            services[
                service
            ] =
                (
                    services[
                        service
                    ] ||
                    0
                ) +
                1;

        }
    );


    serviceReport.innerHTML =

        Object.entries(
            services
        ).length

            ? Object.entries(
                services
            )
                .sort(
                    (a, b) =>
                        b[1] -
                        a[1]
                )
                .map(
                    (
                        [
                            name,
                            count
                        ]
                    ) => `

                        <div class="report-row">

                            <span>
                                ${escapeHTML(
                                    name
                                )}
                            </span>

                            <strong>
                                ${count}
                            </strong>

                        </div>

                    `
                )
                .join(
                    ""
                )

            : `

                <p class="report-empty">
                    No bookings yet.
                </p>

            `;


    const methods =
        {};


    allBookings
        .filter(
            (booking) =>
                booking.payment?.status ===
                "Paid"
        )
        .forEach(
            (booking) => {

                const method =
                    booking.payment.method ||
                    "Unknown";


                methods[
                    method
                ] =
                    (
                        methods[
                            method
                        ] ||
                        0
                    ) +
                    1;

            }
        );


    paymentMethodReport.innerHTML =

        Object.entries(
            methods
        ).length

            ? Object.entries(
                methods
            )
                .map(
                    (
                        [
                            name,
                            count
                        ]
                    ) => `

                        <div class="report-row">

                            <span>
                                ${escapeHTML(
                                    name
                                )}
                            </span>

                            <strong>
                                ${count}
                            </strong>

                        </div>

                    `
                )
                .join(
                    ""
                )

            : `

                <p class="report-empty">
                    No payments recorded.
                </p>

            `;

}


function renderEverything() {

    adminLoading.innerHTML = `

        <span class="live-dot"></span>

        LIVE

    `;


    renderOverview();

    renderRecentBookings();

    renderBookings();

    renderCustomers();

    renderPayments();

}


function openPaymentModal(
    booking
) {

    selectedPaymentBooking =
        booking;


    paymentCustomer.textContent =
        booking.customerName ||
        "Customer";


    paymentService.textContent =
        booking.service ||
        "PC Service";


    paymentBookingId.textContent =
        booking.id;


    paymentAmount.value =
        booking.servicePrice ||
        getServicePrice(
            booking.service
        );


    paymentMethod.value =
        "Cash";


    paymentMessage.textContent =
        "";


    paymentMessage.className =
        "form-message";


    paymentModal.hidden =
        false;


    document.body.classList.add(
        "modal-open"
    );


    paymentAmount.focus();

}


function closePaymentWindow() {

    paymentModal.hidden =
        true;


    selectedPaymentBooking =
        null;


    document.body.classList.remove(
        "modal-open"
    );

}


async function recordPayment() {

    if (
        !selectedPaymentBooking
    ) {

        return;

    }


    const amount =
        Number(
            paymentAmount.value
        );


    if (
        !amount ||
        amount <=
        0
    ) {

        paymentMessage.textContent =
            "Enter a valid payment amount.";


        paymentMessage.className =
            "form-message error";


        return;

    }


    setButtonLoading(
        savePayment,
        true,
        "Saving...",
        "Mark as Paid"
    );


    paymentMessage.textContent =
        "";


    const bookingRef =
        doc(
            db,
            "bookings",
            selectedPaymentBooking.id
        );


    const receiptNumber =
        `RPS-${
            new Date().getFullYear()
        }-${
            selectedPaymentBooking.id
                .slice(
                    0,
                    8
                )
                .toUpperCase()
        }`;


    try {

        await updateDoc(
            bookingRef,
            {

payment: {
    status: "Paid",
    method: paymentMethod.value,
    amount: amount,
    receiptNumber: receiptNumber,
    paidAt: serverTimestamp()
}


            }
        );


        closePaymentWindow();


        showToast(
            "Payment recorded and receipt is now available.",
            "success"
        );

    } catch (error) {

        console.error(
            "Payment error:",
            error
        );


        paymentMessage.textContent =
            error?.code === "permission-denied"
                ? "Firebase denied this update. Check that the latest Firestore rules are published and the signed-in account has role: admin."
                : `Unable to record the payment${error?.code ? ` (${error.code})` : ""}. Please try again.`;


        paymentMessage.className =
            "form-message error";

        showToast(
            paymentMessage.textContent,
            "error"
        );

    } finally {

        setButtonLoading(
            savePayment,
            false,
            "Saving...",
            "Mark as Paid"
        );

    }

}


async function updateBookingStatus(
    bookingId,
    newStatus
) {

    const booking =
        allBookings.find(
            (item) =>
                item.id ===
                bookingId
        );


    if (!booking) {

        return;

    }


    if (
        ![
            "Pending",
            "Confirmed"
        ].includes(
            booking.status
        )
    ) {

        showToast(
            "Completed and cancelled bookings cannot be reopened.",
            "error"
        );


        return;

    }


    if (
        ![
            "Confirmed",
            "Completed",
            "Cancelled"
        ].includes(
            newStatus
        )
    ) {

        return;

    }


    if (
        newStatus ===
        "Confirmed" &&
        booking.status !==
        "Pending"
    ) {

        return;

    }


    if (
        (
            newStatus ===
            "Completed" ||
            newStatus ===
            "Cancelled"
        ) &&
        !isActive(
            booking
        )
    ) {

        return;

    }


    try {

        await runTransaction(
            db,
            async (
                transaction
            ) => {

                const bookingRef =
                    doc(
                        db,
                        "bookings",
                        bookingId
                    );


                const lockRef =
                    doc(
                        db,
                        "bookingLocks",
                        booking.userId
                    );


                const slotId =
                    booking.slotId ||
                    `${booking.date}_${booking.time}`;


                const slotRef =
                    doc(
                        db,
                        "bookingSlots",
                        slotId
                    );


                const bookingSnapshot =
                    await transaction.get(
                        bookingRef
                    );


                if (
                    !bookingSnapshot.exists()
                ) {

                    throw new Error(
                        "BOOKING_NOT_FOUND"
                    );

                }


                const current =
                    bookingSnapshot.data();


                if (
                    ![
                        "Pending",
                        "Confirmed"
                    ].includes(
                        current.status
                    )
                ) {

                    throw new Error(
                        "BOOKING_ALREADY_CLOSED"
                    );

                }


                transaction.update(
                    bookingRef,
                    {
                        status:
                            newStatus
                    }
                );


                if (
                    newStatus ===
                    "Completed"
                ) {

                    transaction.delete(
                        lockRef
                    );

                }


                if (
                    newStatus ===
                    "Cancelled"
                ) {

                    transaction.delete(
                        lockRef
                    );


                    transaction.delete(
                        slotRef
                    );

                }

            }
        );


        showToast(
            `Booking marked ${newStatus.toLowerCase()}.`,
            "success"
        );

    } catch (error) {

        console.error(
            "Status update error:",
            error
        );


        if (
            error.message ===
            "BOOKING_ALREADY_CLOSED"
        ) {

            showToast(
                "This booking was already closed.",
                "error"
            );

        } else {

            showToast(
                "Unable to update booking status.",
                "error"
            );

        }

    }

}


adminBookingsList.addEventListener(
    "click",
    async (event) => {

        const button =
            event.target.closest(
                "[data-action]"
            );


        if (!button) {

            return;

        }


        const booking =
            allBookings.find(
                (item) =>
                    item.id ===
                    button.dataset.id
            );


        if (!booking) {

            return;

        }


        const action =
            button.dataset.action;


        if (
            action ===
            "payment"
        ) {

            openPaymentModal(
                booking
            );


            return;

        }


        const targetStatus =
            action === "confirm"

                ? "Confirmed"

                : action === "complete"

                    ? "Completed"

                    : "Cancelled";


        await updateBookingStatus(
            booking.id,
            targetStatus
        );

    }
);


bookingSearch.addEventListener(
    "input",
    renderBookings
);


statusFilter.addEventListener(
    "change",
    renderBookings
);


serviceFilter.addEventListener(
    "change",
    renderBookings
);


clearFilters.addEventListener(
    "click",
    () => {

        bookingSearch.value =
            "";


        statusFilter.value =
            "All";


        serviceFilter.value =
            "All";


        renderBookings();

    }
);


refreshButton.addEventListener(
    "click",
    () => {

        renderEverything();


        showToast(
            "Dashboard refreshed.",
            "success"
        );

    }
);


closePaymentModal.addEventListener(
    "click",
    closePaymentWindow
);


cancelPayment.addEventListener(
    "click",
    closePaymentWindow
);


paymentModal.addEventListener(
    "click",
    (event) => {

        if (
            event.target ===
            paymentModal
        ) {

            closePaymentWindow();

        }

    }
);


paymentForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        await recordPayment();

    }
);


document
    .querySelectorAll(
        ".admin-sidebar-link[href^='#']"
    )
    .forEach(
        (link) => {

            link.addEventListener(
                "click",
                () => {

                    document
                        .querySelectorAll(
                            ".admin-sidebar-link"
                        )
                        .forEach(
                            (item) =>
                                item.classList.remove(
                                    "active"
                                )
                        );


                    link.classList.add(
                        "active"
                    );

                }
            );

        }
    );


logoutButton.addEventListener(
    "click",
    async () => {

        try {

            await signOut(
                auth
            );


            window.location.replace(
                "/login.html"
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


onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.replace(
                "/login.html"
            );


            return;

        }


        try {

            const profileSnapshot =
                await getDoc(
                    doc(
                        db,
                        "users",
                        user.uid
                    )
                );


            if (
                !profileSnapshot.exists()
            ) {

                await signOut(
                    auth
                );


                window.location.replace(
                    "/login.html"
                );


                return;

            }


            if (
                profileSnapshot.data().role !==
                "admin"
            ) {

                window.location.replace(
                    "/dashboard.html"
                );


                return;

            }


            if (
                initialized
            ) {

                return;

            }


            initialized =
                true;


            unsubscribeBookings =
                onSnapshot(
                    collection(
                        db,
                        "bookings"
                    ),

                    (snapshot) => {

                        allBookings =
                            snapshot.docs.map(
                                (item) => ({

                                    id:
                                        item.id,

                                    ...item.data()

                                })
                            );


                        renderEverything();

                    },

                    (error) => {

                        console.error(
                            "Booking listener error:",
                            error
                        );


                        showToast(
                            "Live booking updates are unavailable.",
                            "error"
                        );

                    }
                );


            unsubscribeUsers =
                onSnapshot(
                    collection(
                        db,
                        "users"
                    ),

                    (snapshot) => {

                        allUsers =
                            snapshot.docs.map(
                                (item) => ({

                                    id:
                                        item.id,

                                    ...item.data()

                                })
                            );


                        renderEverything();

                    },

                    (error) => {

                        console.error(
                            "User listener error:",
                            error
                        );


                        showToast(
                            "Live customer updates are unavailable.",
                            "error"
                        );

                    }
                );

        } catch (error) {

            console.error(
                "Admin authentication error:",
                error
            );


            showToast(
                "Unable to load the admin dashboard.",
                "error"
            );


            window.location.replace(
                "/dashboard.html"
            );

        }

    }
);


window.addEventListener(
    "pagehide",
    () => {

        if (
            unsubscribeBookings
        ) {

            unsubscribeBookings();

        }


        if (
            unsubscribeUsers
        ) {

            unsubscribeUsers();

        }

    }
);