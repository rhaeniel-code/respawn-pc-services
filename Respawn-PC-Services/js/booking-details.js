// ============================================================
// RESPawn PC Services
// BOOKING DETAILS
// ============================================================

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    doc,
    getDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";

import {
    formatDate,
    formatPHP,
    formatTime,
    formatTimestamp,
    showToast,
    statusClass
} from "./ui.js";


const loading =
    document.getElementById(
        "detailsLoading"
    );


const content =
    document.getElementById(
        "detailsContent"
    );


const errorBox =
    document.getElementById(
        "detailsError"
    );


const errorMessage =
    document.getElementById(
        "detailsErrorMessage"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


let unsubscribeBooking =
    null;


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


function showError(
    message
) {

    loading.hidden =
        true;


    content.hidden =
        true;


    errorBox.hidden =
        false;


    errorMessage.textContent =
        message;

}


function renderBooking(
    bookingId,
    booking
) {

    loading.hidden =
        true;


    errorBox.hidden =
        true;


    content.hidden =
        false;


    document.getElementById(
        "detailsTitle"
    ).textContent =
        booking.service ||
        "PC Service";


    document.getElementById(
        "detailsSubtitle"
    ).textContent =

        booking.status ===
        "Completed"

            ? "This appointment has been completed."

            : "Your appointment and payment information.";


    const status =
        document.getElementById(
            "detailsStatus"
        );


    status.textContent =
        booking.status ||
        "Pending";


    status.className =
        statusClass(
            booking.status
        );


    document.getElementById(
        "detailsDropOff"
    ).textContent =

        booking.date &&
        booking.time

            ? `${formatDate(
                booking.date
            )} at ${formatTime(
                booking.time
            )}`

            : "Not specified";


    document.getElementById(
        "detailsPickup"
    ).textContent =
        formatDate(
            booking.pickupDate
        );


    document.getElementById(
        "detailsBookingId"
    ).textContent =
        bookingId;


    document.getElementById(
        "detailsCreated"
    ).textContent =
        formatTimestamp(
            booking.createdAt
        );


    document.getElementById(
        "detailsCustomer"
    ).textContent =
        booking.customerName ||
        "";


    document.getElementById(
        "detailsEmail"
    ).textContent =
        booking.email ||
        "";


    document.getElementById(
        "detailsService"
    ).textContent =
        booking.service ||
        "PC Service";


    document.getElementById(
        "detailsPrice"
    ).textContent =
        formatPHP(
            booking.servicePrice ||
            0
        );


    document.getElementById(
        "detailsDescription"
    ).textContent =
        booking.description ||
        "No description provided.";


    const paymentPanel =
        document.getElementById(
            "paymentStatusPanel"
        );


    const receiptActions =
        document.getElementById(
            "receiptActions"
        );


    if (
        booking.payment?.status ===
        "Paid"
    ) {

        paymentPanel.innerHTML = `

            <div class="payment-status-paid">

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
                        "Payment"
                    )}
                </small>

            </div>


            <div class="payment-info-list">

                <p>

                    <span>
                        Receipt
                    </span>

                    <strong>
                        ${escapeHTML(
                            booking.payment.receiptNumber ||
                            "Available"
                        )}
                    </strong>

                </p>


                <p>

                    <span>
                        Paid
                    </span>

                    <strong>
                        ${escapeHTML(
                            formatTimestamp(
                                booking.payment.paidAt
                            )
                        )}
                    </strong>

                </p>

            </div>

        `;


        receiptActions.innerHTML = `

            <a
                href="/receipt.html?bookingId=${encodeURIComponent(
                    bookingId
                )}"
                class="primary-button"
            >
                View Receipt →
            </a>

        `;

    } else {

        paymentPanel.innerHTML = `

            <div class="payment-status-unpaid">

                <span>
                    UNPAID
                </span>

                <strong>
                    ${escapeHTML(
                        formatPHP(
                            booking.servicePrice ||
                            0
                        )
                    )}
                </strong>

                <small>
                    Payment will be recorded by the
                    service administrator.
                </small>

            </div>

        `;


        receiptActions.innerHTML = `

            <span class="payment-note">
                Your receipt will become available
                after payment is recorded.
            </span>

        `;

    }

}


async function start(
    user
) {

    const bookingId =
        new URLSearchParams(
            window.location.search
        ).get(
            "bookingId"
        );


    if (!bookingId) {

        showError(
            "No booking was specified."
        );


        return;

    }


    const userSnapshot =
        await getDoc(
            doc(
                db,
                "users",
                user.uid
            )
        );


    if (
        !userSnapshot.exists()
    ) {

        await signOut(
            auth
        );


        window.location.replace(
            "/login.html"
        );


        return;

    }


    const isAdmin =
        userSnapshot.data().role ===
        "admin";


    const bookingRef =
        doc(
            db,
            "bookings",
            bookingId
        );


    unsubscribeBooking =
        onSnapshot(
            bookingRef,

            (snapshot) => {

                if (
                    !snapshot.exists()
                ) {

                    showError(
                        "This booking could not be found."
                    );


                    return;

                }


                const booking =
                    snapshot.data();


                if (
                    !isAdmin &&
                    booking.userId !==
                    user.uid
                ) {

                    showError(
                        "You do not have permission to view this booking."
                    );


                    return;

                }


                document.getElementById(
                    "backDashboard"
                ).href =
                    isAdmin
                        ? "/admin-dashboard.html"
                        : "/dashboard.html";


                renderBooking(
                    bookingId,
                    booking
                );

            },

            (error) => {

                console.error(
                    "Booking detail listener error:",
                    error
                );


                showError(

                    error.code ===
                    "permission-denied"

                        ? "You do not have permission to view this booking."

                        : "Unable to load this booking."

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

            await start(
                user
            );

        } catch (error) {

            console.error(
                "Booking details error:",
                error
            );


            showError(
                "Unable to load this booking."
            );


            showToast(
                "Unable to load booking details.",
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
            unsubscribeBooking
        ) {

            unsubscribeBooking();

        }

    }
);