// ============================================================
// RESPawn PC Services
// RECEIPT
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
    showToast
} from "./ui.js";


const loading =
    document.getElementById(
        "receiptLoading"
    );


const content =
    document.getElementById(
        "receiptContent"
    );


const errorBox =
    document.getElementById(
        "receiptError"
    );


const errorMessage =
    document.getElementById(
        "receiptErrorMessage"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const printButton =
    document.getElementById(
        "printReceipt"
    );


let unsubscribeReceipt =
    null;


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


function renderReceipt(
    bookingId,
    booking
) {

    if (
        booking.payment?.status !==
        "Paid"
    ) {

        showError(
            "Payment has not been recorded yet. The receipt will become available after payment."
        );


        return;

    }


    const payment =
        booking.payment;


    const amount =
        Number(
            payment.amount ??
            booking.servicePrice ??
            0
        );


    const receiptNumber =
        payment.receiptNumber ||
        `RPS-${
            new Date().getFullYear()
        }-${
            bookingId
                .slice(
                    0,
                    8
                )
                .toUpperCase()
        }`;


    document.getElementById(
        "receiptNumber"
    ).textContent =
        receiptNumber;


    document.getElementById(
        "receiptBookingId"
    ).textContent =
        bookingId;


    document.getElementById(
        "receiptCustomer"
    ).textContent =
        booking.customerName ||
        "";


    document.getElementById(
        "receiptEmail"
    ).textContent =
        booking.email ||
        "";


    document.getElementById(
        "receiptService"
    ).textContent =
        booking.service ||
        "PC Service";


    document.getElementById(
        "receiptAmount"
    ).textContent =
        formatPHP(
            amount
        );


    document.getElementById(
        "receiptTotal"
    ).textContent =
        formatPHP(
            amount
        );


    document.getElementById(
        "receiptDropOff"
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
        "receiptPickup"
    ).textContent =
        formatDate(
            booking.pickupDate
        );


    document.getElementById(
        "receiptMethod"
    ).textContent =
        payment.method ||
        "Not specified";


    document.getElementById(
        "receiptPaidAt"
    ).textContent =
        formatTimestamp(
            payment.paidAt
        );


    loading.hidden =
        true;


    errorBox.hidden =
        true;


    content.hidden =
        false;

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


    const isAdmin =
        profileSnapshot.data().role ===
        "admin";


    const bookingRef =
        doc(
            db,
            "bookings",
            bookingId
        );


    unsubscribeReceipt =
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
                        "You do not have permission to view this receipt."
                    );


                    return;

                }


                renderReceipt(
                    bookingId,
                    booking
                );

            },

            (error) => {

                console.error(
                    "Receipt listener error:",
                    error
                );


                showError(

                    error.code ===
                    "permission-denied"

                        ? "You do not have permission to view this receipt. Check that you are signed in as the booking owner or an administrator."

                        : `Unable to load this receipt${error?.code ? ` (${error.code})` : ""}.`

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
                "Receipt error:",
                error
            );


            showError(
                "Unable to load this receipt."
            );


            showToast(
                "Unable to load receipt.",
                "error"
            );

        }

    }
);


printButton.addEventListener(
    "click",
    () => {

        window.print();

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
            unsubscribeReceipt
        ) {

            unsubscribeReceipt();

        }

    }
);