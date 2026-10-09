// ============================================================
// RESPawn PC Services
// CUSTOMER BOOKINGS
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
    where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";

import {
    formatDate,
    formatPHP,
    formatTime,
    showToast,
    statusClass
} from "./ui.js";


const bookingsList =
    document.getElementById(
        "bookingsList"
    );


const loadingBookings =
    document.getElementById(
        "loadingBookings"
    );


const emptyBookings =
    document.getElementById(
        "emptyBookings"
    );


const bookingSummary =
    document.getElementById(
        "bookingSummary"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


let unsubscribeBookings =
    null;


function appointmentValue(
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


function escapeHTML(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function renderBookings(
    bookings
) {

    loadingBookings.hidden =
        true;


    bookingsList.innerHTML =
        "";


    bookingSummary.textContent =
        `${bookings.length} booking${
            bookings.length ===
            1
                ? ""
                : "s"
        }`;


    if (
        bookings.length ===
        0
    ) {

        emptyBookings.hidden =
            false;


        return;

    }


    emptyBookings.hidden =
        true;


    bookings.sort(
        (a, b) =>
            appointmentValue(
                b
            ) -
            appointmentValue(
                a
            )
    );


    bookings.forEach(
        (booking) => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "booking-history-card";


            const paymentPaid =
                booking.payment?.status ===
                "Paid";


            const paymentText =
                paymentPaid

                    ? `PAID · ${formatPHP(
                        booking.payment.amount
                    )}`

                    : "UNPAID";


            const price =
                booking.servicePrice ||
                0;


            card.innerHTML = `

                <div class="booking-history-main">

                    <div class="booking-history-title-row">

                        <div>

                            <p class="card-eyebrow">
                                ${
                                    booking.status ===
                                    "Pending"
                                        ? "REQUEST"
                                        : "APPOINTMENT"
                                }
                            </p>

                            <h3>
                                ${escapeHTML(
                                    booking.service ||
                                    "PC Service"
                                )}
                            </h3>

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


                    <div class="booking-history-grid">

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
                                PRICE
                            </span>

                            <strong>
                                ${escapeHTML(
                                    formatPHP(
                                        price
                                    )
                                )}
                            </strong>

                        </div>


                        <div>

                            <span>
                                PAYMENT
                            </span>

                            <strong
                                class="${
                                    paymentPaid
                                        ? "text-success"
                                        : "text-warning"
                                }"
                            >

                                ${escapeHTML(
                                    paymentText
                                )}

                            </strong>

                        </div>

                    </div>

                </div>


                <div class="booking-history-actions">

                    <a
                        href="/booking-details.html?bookingId=${encodeURIComponent(
                            booking.id
                        )}"
                        class="primary-button"
                    >
                        View Details
                    </a>

                    ${
                        paymentPaid
                            ? `
                                <a
                                    href="/receipt.html?bookingId=${encodeURIComponent(
                                        booking.id
                                    )}"
                                    class="secondary-button"
                                >
                                    View Receipt
                                </a>
                              `
                            : `
                                <span class="payment-note">
                                    Receipt unlocks after payment.
                                </span>
                              `
                    }

                </div>

            `;


            bookingsList.appendChild(
                card
            );

        }
    );

}


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
                profileSnapshot.data().role ===
                "admin"
            ) {

                window.location.replace(
                    "/admin-dashboard.html"
                );


                return;

            }


            const bookingsQuery =
                query(
                    collection(
                        db,
                        "bookings"
                    ),

                    where(
                        "userId",
                        "==",
                        user.uid
                    )
                );


            unsubscribeBookings =
                onSnapshot(
                    bookingsQuery,

                    (snapshot) => {

                        const bookings =
                            snapshot.docs.map(
                                (item) => ({

                                    id:
                                        item.id,

                                    ...item.data()

                                })
                            );


                        renderBookings(
                            bookings
                        );

                    },

                    (error) => {

                        console.error(
                            "Bookings listener error:",
                            error
                        );


                        loadingBookings.hidden =
                            true;


                        showToast(
                            "Unable to load live booking updates.",
                            "error"
                        );

                    }
                );

        } catch (error) {

            console.error(
                "Bookings page error:",
                error
            );


            loadingBookings.hidden =
                true;


            showToast(
                "Unable to load your bookings.",
                "error"
            );

        }

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


window.addEventListener(
    "pagehide",
    () => {

        if (
            unsubscribeBookings
        ) {

            unsubscribeBookings();

        }

    }
);