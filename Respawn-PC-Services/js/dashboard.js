// ============================================================
// RESPawn PC Services
// CUSTOMER DASHBOARD
// Real-time booking updates
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


// ============================================================
// AUTH LOADING SCREEN
// ============================================================

const dashboardAuthGate =
    document.getElementById(
        "dashboardAuthGate"
    );


function hideDashboardAuthGate() {

    if (
        dashboardAuthGate
    ) {

        dashboardAuthGate.hidden =
            true;

    }

}


// ============================================================
// ELEMENTS
// ============================================================

const welcomeName =
    document.getElementById(
        "welcomeName"
    );


const profileName =
    document.getElementById(
        "profileName"
    );


const profileEmail =
    document.getElementById(
        "profileEmail"
    );


const profileRole =
    document.getElementById(
        "profileRole"
    );


const activeBookingSkeleton =
    document.getElementById(
        "activeBookingSkeleton"
    );


const activeBookingContent =
    document.getElementById(
        "activeBookingContent"
    );


const activeBookingEmpty =
    document.getElementById(
        "activeBookingEmpty"
    );


const activeService =
    document.getElementById(
        "activeService"
    );


const activeStatus =
    document.getElementById(
        "activeStatus"
    );


const activeDropOff =
    document.getElementById(
        "activeDropOff"
    );


const activePickup =
    document.getElementById(
        "activePickup"
    );


const activePayment =
    document.getElementById(
        "activePayment"
    );


const activeDetailsLink =
    document.getElementById(
        "activeDetailsLink"
    );


const miniProgressFill =
    document.getElementById(
        "miniProgressFill"
    );


const miniProgressLabel =
    document.getElementById(
        "miniProgressLabel"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


// ============================================================
// STATE
// ============================================================

let currentUser =
    null;


let unsubscribeBookings =
    null;


// ============================================================
// APPOINTMENT DATE
// ============================================================

function appointmentDateValue(
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


    return Number.MAX_SAFE_INTEGER;

}


// ============================================================
// ACTIVE BOOKING
// ============================================================

function isActive(
    booking
) {

    return (
        booking.status ===
            "Pending"

        ||

        booking.status ===
            "Confirmed"
    );

}


// ============================================================
// RENDER ACTIVE BOOKING
// ============================================================

function renderActiveBooking(
    booking
) {

    activeBookingSkeleton.hidden =
        true;


    if (!booking) {

        activeBookingContent.hidden =
            true;


        activeBookingEmpty.hidden =
            false;


        return;

    }


    activeBookingEmpty.hidden =
        true;


    activeBookingContent.hidden =
        false;


    activeService.textContent =
        booking.service ||
        "PC Service";


    activeStatus.className =
        statusClass(
            booking.status
        );


    activeStatus.textContent =
        booking.status ||
        "Pending";


    activeDropOff.textContent =
        `${formatDate(
            booking.date,
            {
                weekday:
                    "short"
            }
        )} • ${formatTime(
            booking.time
        )}`;


    activePickup.textContent =
        formatDate(
            booking.pickupDate,
            {
                weekday:
                    "short"
            }
        );


    if (
        booking.payment?.status ===
        "Paid"
    ) {

        activePayment.textContent =
            `PAID • ${formatPHP(
                booking.payment.amount
            )}`;


    } else {

        activePayment.textContent =
            "UNPAID";

    }


    activeDetailsLink.href =
        `/booking-details.html?bookingId=${
            encodeURIComponent(
                booking.id
            )
        }`;


    if (
        booking.status ===
        "Confirmed"
    ) {

        miniProgressFill.style.width =
            "65%";


        miniProgressLabel.textContent =
            "Confirmed — ready for drop-off";


    } else {

        miniProgressFill.style.width =
            "32%";


        miniProgressLabel.textContent =
            "Pending admin confirmation";

    }

}


// ============================================================
// RENDER METRICS
// ============================================================

function renderMetrics(
    bookings
) {

    const active =
        bookings.filter(
            isActive
        ).length;


    const completed =
        bookings.filter(
            (booking) =>
                booking.status ===
                "Completed"
        ).length;


    const paid =
        bookings.filter(
            (booking) =>
                booking.payment?.status ===
                "Paid"
        ).length;


    document.getElementById(
        "metricActive"
    ).textContent =
        active;


    document.getElementById(
        "metricCompleted"
    ).textContent =
        completed;


    document.getElementById(
        "metricPaid"
    ).textContent =
        paid;


    document.getElementById(
        "metricTotal"
    ).textContent =
        bookings.length;

}


// ============================================================
// VERIFY USER ROLE
// ============================================================

async function verifyUser(
    user
) {

    const profileSnapshot =
        await getDoc(
            doc(
                db,
                "users",
                user.uid
            )
        );


    // --------------------------------------------------------
    // USER PROFILE DOES NOT EXIST
    // --------------------------------------------------------

    if (
        !profileSnapshot.exists()
    ) {

        await signOut(
            auth
        );


        window.location.replace(
            "/login.html"
        );


        return null;

    }


    const profile =
        profileSnapshot.data();


    // --------------------------------------------------------
    // ADMIN
    // --------------------------------------------------------
    //
    // Keep the loading overlay visible while redirecting.
    // This prevents the customer dashboard from flashing.
    // --------------------------------------------------------

    if (
        profile.role ===
        "admin"
    ) {

        window.location.replace(
            "/admin-dashboard.html"
        );


        return null;

    }


    // --------------------------------------------------------
    // CUSTOMER
    // --------------------------------------------------------

    welcomeName.textContent =
        profile.fullName ||
        "Customer";


    profileName.textContent =
        profile.fullName ||
        "Customer";


    profileEmail.textContent =
        profile.email ||
        user.email ||
        "";


    profileRole.textContent =
        profile.role ||
        "customer";


    // Customer is verified.
    // Now reveal the actual dashboard.

    hideDashboardAuthGate();


    return profile;

}


// ============================================================
// BOOKING LISTENER
// ============================================================

function subscribeToBookings(
    user
) {

    if (
        unsubscribeBookings
    ) {

        unsubscribeBookings();

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


                const activeBooking =
                    bookings

                        .filter(
                            isActive
                        )

                        .sort(
                            (a, b) =>

                                appointmentDateValue(
                                    a
                                )

                                -

                                appointmentDateValue(
                                    b
                                )

                        )[0]

                        ||

                    null;


                renderActiveBooking(
                    activeBooking
                );


                renderMetrics(
                    bookings
                );

            },


            (error) => {

                console.error(
                    "Dashboard listener error:",
                    error
                );


                activeBookingSkeleton.hidden =
                    true;


                showToast(
                    "Live booking updates are unavailable right now.",
                    "error"
                );

            }

        );

}


// ============================================================
// AUTH STATE
// ============================================================

onAuthStateChanged(
    auth,
    async (user) => {

        // ----------------------------------------------------
        // NOT LOGGED IN
        // ----------------------------------------------------

        if (!user) {

            window.location.replace(
                "/login.html"
            );


            return;

        }


        currentUser =
            user;


        try {

            const profile =
                await verifyUser(
                    user
                );


            // Admins are redirected.
            // The loading overlay remains visible.

            if (!profile) {

                return;

            }


            subscribeToBookings(
                user
            );


        } catch (error) {

            console.error(
                "Dashboard error:",
                error
            );


            // Prevent a permanent loading overlay.

            hideDashboardAuthGate();


            showToast(
                "Unable to load your dashboard.",
                "error"
            );

        }

    }
);


// ============================================================
// LOGOUT
// ============================================================

logoutButton.addEventListener(
    "click",
    async () => {

        logoutButton.disabled =
            true;


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


            logoutButton.disabled =
                false;


            showToast(
                "Unable to log out. Please try again.",
                "error"
            );

        }

    }
);


// ============================================================
// CLEANUP
// ============================================================

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