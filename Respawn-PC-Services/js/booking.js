// ============================================================
// RESPawn PC Services
// BOOKING WIZARD
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
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import {
    auth,
    db
} from "./firebase.js";

import {
    SERVICE_PRICES,
    formatPHP
} from "./pricing.js";

import {
    formatDate,
    formatTime,
    showToast,
    setButtonLoading
} from "./ui.js";


const OPEN_HOUR =
    10;


const CLOSE_HOUR =
    20;


const SLOT_INTERVAL =
    30;


const PH_OFFSET =
    8;


const DAYS_TO_GENERATE =
    60;


const DATES_PER_PAGE =
    7;


const bookingForm =
    document.getElementById(
        "bookingForm"
    );


const customerName =
    document.getElementById(
        "customerName"
    );


const customerEmail =
    document.getElementById(
        "customerEmail"
    );


const bookingDate =
    document.getElementById(
        "bookingDate"
    );


const bookingTime =
    document.getElementById(
        "bookingTime"
    );


const availableDates =
    document.getElementById(
        "availableDates"
    );


const availableTimes =
    document.getElementById(
        "availableTimes"
    );


const dateMessage =
    document.getElementById(
        "dateMessage"
    );


const timeMessage =
    document.getElementById(
        "timeMessage"
    );


const pickupPreview =
    document.getElementById(
        "pickupPreview"
    );


const description =
    document.getElementById(
        "description"
    );


const descriptionCount =
    document.getElementById(
        "descriptionCount"
    );


const submitBooking =
    document.getElementById(
        "submitBooking"
    );


const bookingMessage =
    document.getElementById(
        "bookingMessage"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const activeBookingNotice =
    document.getElementById(
        "activeBookingNotice"
    );


const previousDates =
    document.getElementById(
        "previousDates"
    );


const nextDates =
    document.getElementById(
        "nextDates"
    );


const nextStep =
    document.getElementById(
        "nextStep"
    );


const backStep =
    document.getElementById(
        "backStep"
    );


const bookingSuccess =
    document.getElementById(
        "bookingSuccess"
    );


let currentUser =
    null;


let authReady =
    false;


let currentStep =
    1;


let hasActiveBooking =
    false;


let availableDateList =
    [];


let bookedSlotsByDate =
    {};


let currentDatePage =
    0;


let unsubscribeSlots =
    null;


document
    .querySelectorAll(
        ".service-price"
    )
    .forEach(
        (element) => {

            element.textContent =
                formatPHP(
                    SERVICE_PRICES[
                        element.dataset.service
                    ] ||
                    0
                );

        }
    );


function showMessage(
    message,
    type = ""
) {

    bookingMessage.textContent =
        message;


    bookingMessage.className =
        `form-message ${type}`;

}


function getPhilippineParts(
    date = new Date()
) {

    const shifted =
        new Date(
            date.getTime() +
            PH_OFFSET *
            60 *
            60 *
            1000
        );


    return {

        year:
            shifted.getUTCFullYear(),

        month:
            shifted.getUTCMonth() +
            1,

        day:
            shifted.getUTCDate(),

        weekday:
            shifted.getUTCDay()

    };

}


function formatInputDate(
    date
) {

    return (

        `${date.getUTCFullYear()}-` +

        `${String(
            date.getUTCMonth() + 1
        ).padStart(
            2,
            "0"
        )}-` +

        `${String(
            date.getUTCDate()
        ).padStart(
            2,
            "0"
        )}`

    );

}


function formatFriendlyDate(
    dateString
) {

    return formatDate(
        dateString
    );

}


function getNextBusinessDay(
    dateString
) {

    const [
        year,
        month,
        day
    ] =
        dateString
            .split("-")
            .map(Number);


    const date =
        new Date(
            Date.UTC(
                year,
                month - 1,
                day
            )
        );


    do {

        date.setUTCDate(
            date.getUTCDate() +
            1
        );

    } while (
        date.getUTCDay() ===
        0
    );


    return formatInputDate(
        date
    );

}


function createPhilippineDateTime(
    dateString,
    timeString
) {

    const [
        year,
        month,
        day
    ] =
        dateString
            .split("-")
            .map(Number);


    const [
        hour,
        minute
    ] =
        timeString
            .split(":")
            .map(Number);


    return new Date(
        Date.UTC(
            year,
            month - 1,
            day,
            hour -
                PH_OFFSET,
            minute,
            0,
            0
        )
    );

}


function isBusinessDay(
    weekday
) {

    return (
        weekday >= 1 &&
        weekday <= 6
    );

}


function isAtLeast24HoursAhead(
    dateString,
    timeString
) {

    const appointment =
        createPhilippineDateTime(
            dateString,
            timeString
        );


    return (
        appointment.getTime() >=
        Date.now() +
        24 *
        60 *
        60 *
        1000
    );

}


function generateTimeSlots() {

    const slots =
        [];


    for (
        let minutes =
            OPEN_HOUR *
            60;

        minutes <=
            CLOSE_HOUR *
            60;

        minutes +=
            SLOT_INTERVAL
    ) {

        const hour =
            Math.floor(
                minutes /
                60
            );


        const minute =
            minutes %
            60;


        slots.push(
            `${String(
                hour
            ).padStart(
                2,
                "0"
            )}:${String(
                minute
            ).padStart(
                2,
                "0"
            )}`
        );

    }


    return slots;

}


const timeSlots =
    generateTimeSlots();


function getFreeSlots(
    dateString
) {

    const booked =
        bookedSlotsByDate[
            dateString
        ] ||
        new Set();


    return timeSlots.filter(
        (time) =>
            !booked.has(
                time
            )
    );

}


function buildAvailableDatePool() {

    const pool =
        [];


    const now =
        new Date();


    const ph =
        getPhilippineParts(
            now
        );


    const start =
        new Date(
            Date.UTC(
                ph.year,
                ph.month - 1,
                ph.day
            )
        );


    for (
        let i = 0;
        i < DAYS_TO_GENERATE;
        i++
    ) {

        const date =
            new Date(
                start
            );


        date.setUTCDate(
            start.getUTCDate() +
            i
        );


        const dateString =
            formatInputDate(
                date
            );


        const weekday =
            date.getUTCDay();


        if (
            !isBusinessDay(
                weekday
            )
        ) {

            continue;

        }


        const freeSlots =
            getFreeSlots(
                dateString
            );


        const validSlots =
            freeSlots.filter(
                (time) =>
                    isAtLeast24HoursAhead(
                        dateString,
                        time
                    )
            );


        if (
            validSlots.length > 0
        ) {

            pool.push(
                dateString
            );

        }

    }


    availableDateList =
        pool;


    const totalPages =
        Math.ceil(
            availableDateList.length /
            DATES_PER_PAGE
        );


    currentDatePage =
        Math.min(
            currentDatePage,
            Math.max(
                0,
                totalPages - 1
            )
        );


    renderDatePage();

}


function renderDatePage() {

    availableDates.innerHTML =
        "";


    if (
        availableDateList.length ===
        0
    ) {

        dateMessage.textContent =
            "No available dates were found in the current booking window.";

        previousDates.disabled =
            true;

        nextDates.disabled =
            true;

        renderTimes();

        return;

    }


    const start =
        currentDatePage *
        DATES_PER_PAGE;


    const page =
        availableDateList.slice(
            start,
            start +
                DATES_PER_PAGE
        );


    const totalPages =
        Math.ceil(
            availableDateList.length /
            DATES_PER_PAGE
        );


    previousDates.disabled =
        currentDatePage ===
        0;


    nextDates.disabled =
        currentDatePage >=
        totalPages -
        1;


    dateMessage.textContent =
        `Available dates ${
            start + 1
        }–${
            Math.min(
                start +
                DATES_PER_PAGE,
                availableDateList.length
            )
        } of ${
            availableDateList.length
        }`;


    page.forEach(
        (dateString) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "date-option";


            button.dataset.date =
                dateString;


            if (
                bookingDate.value ===
                dateString
            ) {

                button.classList.add(
                    "selected"
                );

            }


            const [
                year,
                month,
                day
            ] =
                dateString
                    .split("-")
                    .map(Number);


            const date =
                new Date(
                    Date.UTC(
                        year,
                        month - 1,
                        day
                    )
                );


            const freeCount =
                getFreeSlots(
                    dateString
                )
                    .filter(
                        (time) =>
                            isAtLeast24HoursAhead(
                                dateString,
                                time
                            )
                    )
                    .length;


            button.innerHTML = `

                <span>
                    ${
                        date.toLocaleDateString(
                            "en-US",
                            {
                                weekday:
                                    "short",
                                timeZone:
                                    "UTC"
                            }
                        )
                    }
                </span>

                <strong>
                    ${
                        date.toLocaleDateString(
                            "en-US",
                            {
                                month:
                                    "short",
                                day:
                                    "numeric",
                                timeZone:
                                    "UTC"
                            }
                        )
                    }
                </strong>

                <small>
                    ${freeCount}
                    open slots
                </small>

            `;


            button.addEventListener(
                "click",
                () => {

                    bookingDate.value =
                        dateString;


                    bookingTime.value =
                        "";


                    renderDatePage();

                    renderTimes();

                    renderPickupPreview();

                    updateReview();

                }
            );


            availableDates.appendChild(
                button
            );

        }
    );

}


function renderTimes() {

    availableTimes.innerHTML =
        "";


    if (
        !bookingDate.value
    ) {

        timeMessage.textContent =
            "Select a date first.";

        return;

    }


    const freeSlots =
        getFreeSlots(
            bookingDate.value
        ).filter(
            (time) =>
                isAtLeast24HoursAhead(
                    bookingDate.value,
                    time
                )
        );


    if (
        freeSlots.length ===
        0
    ) {

        timeMessage.textContent =
            "No slots remain for this date.";

        return;

    }


    timeMessage.textContent =
        `${freeSlots.length} open appointment slots.`;


    freeSlots.forEach(
        (time) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "time-option";


            button.textContent =
                formatTime(
                    time
                );


            if (
                bookingTime.value ===
                time
            ) {

                button.classList.add(
                    "selected"
                );

            }


            button.addEventListener(
                "click",
                () => {

                    bookingTime.value =
                        time;


                    renderTimes();

                    updateReview();

                }
            );


            availableTimes.appendChild(
                button
            );

        }
    );

}


function renderPickupPreview() {

    if (
        !bookingDate.value
    ) {

        pickupPreview.textContent =
            "Select a drop-off date to see your expected pickup date.";


        return;

    }


    pickupPreview.textContent =
        `Expected pickup: ${
            formatFriendlyDate(
                getNextBusinessDay(
                    bookingDate.value
                )
            )
        }.`;

}


async function checkActiveBooking(
    user
) {

    const lockSnapshot =
        await getDoc(
            doc(
                db,
                "bookingLocks",
                user.uid
            )
        );


    hasActiveBooking =
        lockSnapshot.exists();


    activeBookingNotice.hidden =
        !hasActiveBooking;


    document
        .querySelectorAll(
            ".progress-step, #nextStep, #submitBooking"
        )
        .forEach(
            (element) => {

                if (
                    hasActiveBooking
                ) {

                    element.disabled =
                        true;

                }

            }
        );


    return hasActiveBooking;

}


function setStep(
    step
) {

    currentStep =
        Math.max(
            1,
            Math.min(
                5,
                step
            )
        );


    document
        .querySelectorAll(
            ".progress-step"
        )
        .forEach(
            (button) => {

                const buttonStep =
                    Number(
                        button.dataset.step
                    );


                button.classList.toggle(
                    "active",
                    buttonStep ===
                    currentStep
                );


                button.classList.toggle(
                    "complete",
                    buttonStep <
                    currentStep
                );

            }
        );


    document
        .querySelectorAll(
            "[data-step-content]"
        )
        .forEach(
            (section) => {

                const sectionStep =
                    Number(
                        section.dataset.stepContent
                    );


                section.hidden =
                    sectionStep !==
                    currentStep;


                section.classList.toggle(
                    "active",
                    sectionStep ===
                    currentStep
                );

            }
        );


    backStep.hidden =
        currentStep ===
        1;


    nextStep.hidden =
        currentStep ===
        5;


    submitBooking.hidden =
        currentStep !==
        5;


    updateReview();

    showMessage(
        ""
    );


    window.scrollTo(
        {
            top:
                0,

            behavior:
                "smooth"
        }
    );

}


function validateStep(
    step
) {

    if (
        step ===
        1
    ) {

        if (
            !customerName.value ||
            !customerEmail.value
        ) {

            showMessage(
                "Your account information is still loading. Please wait a moment.",
                "error"
            );


            return false;

        }

    }


    if (
        step ===
        2
    ) {

        if (
            !document.querySelector(
                'input[name="service"]:checked'
            )
        ) {

            showMessage(
                "Please select a service before continuing.",
                "error"
            );


            return false;

        }

    }


    if (
        step ===
        3
    ) {

        if (
            !bookingDate.value
        ) {

            showMessage(
                "Please select an available drop-off date.",
                "error"
            );


            return false;

        }


        if (
            !bookingTime.value
        ) {

            showMessage(
                "Please select an available drop-off time.",
                "error"
            );


            return false;

        }


        if (
            !isAtLeast24HoursAhead(
                bookingDate.value,
                bookingTime.value
            )
        ) {

            showMessage(
                "Appointments must be booked at least 24 hours in advance.",
                "error"
            );


            return false;

        }

    }


    if (
        step ===
        4
    ) {

        if (
            description.value
                .trim()
                .length <
            5
        ) {

            showMessage(
                "Please describe the PC issue in a little more detail.",
                "error"
            );


            description.focus();


            return false;

        }

    }


    return true;

}


function updateReview() {

    const selectedService =
        document.querySelector(
            'input[name="service"]:checked'
        )?.value ||
        "—";


    const price =
        selectedService ===
        "—"
            ? 0
            : (
                SERVICE_PRICES[
                    selectedService
                ] ||
                0
            );


    document.getElementById(
        "reviewCustomer"
    ).textContent =
        customerName.value ||
        "—";


    document.getElementById(
        "reviewService"
    ).textContent =
        selectedService;


    document.getElementById(
        "reviewPrice"
    ).textContent =
        formatPHP(
            price
        );


    document.getElementById(
        "reviewDropOff"
    ).textContent =

        bookingDate.value &&
        bookingTime.value

            ? `${formatFriendlyDate(
                bookingDate.value
            )} at ${formatTime(
                bookingTime.value
            )}`

            : "—";


    document.getElementById(
        "reviewPickup"
    ).textContent =

        bookingDate.value

            ? formatFriendlyDate(
                getNextBusinessDay(
                    bookingDate.value
                )
            )

            : "—";


    document.getElementById(
        "reviewDescription"
    ).textContent =
        description.value.trim() ||
        "—";

}


function updateDescriptionCount() {

    descriptionCount.textContent =
        description.value.length;


    updateReview();

}


document
    .querySelectorAll(
        ".progress-step"
    )
    .forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    const target =
                        Number(
                            button.dataset.step
                        );


                    if (
                        target >
                        currentStep
                    ) {

                        let valid =
                            true;


                        for (
                            let step =
                                currentStep;

                            step <
                            target;

                            step++
                        ) {

                            if (
                                !validateStep(
                                    step
                                )
                            ) {

                                valid =
                                    false;

                                break;

                            }

                        }


                        if (
                            !valid
                        ) {

                            return;

                        }

                    }


                    setStep(
                        target
                    );

                }
            );

        }
    );


nextStep.addEventListener(
    "click",
    () => {

        if (
            !validateStep(
                currentStep
            )
        ) {

            return;

        }


        setStep(
            currentStep +
            1
        );

    }
);


backStep.addEventListener(
    "click",
    () => {

        setStep(
            currentStep -
            1
        );

    }
);


description.addEventListener(
    "input",
    updateDescriptionCount
);


document
    .querySelectorAll(
        'input[name="service"]'
    )
    .forEach(
        (radio) => {

            radio.addEventListener(
                "change",
                updateReview
            );

        }
    );


previousDates.addEventListener(
    "click",
    () => {

        if (
            currentDatePage >
            0
        ) {

            currentDatePage--;

            renderDatePage();

            renderTimes();

        }

    }
);


nextDates.addEventListener(
    "click",
    () => {

        const maxPage =
            Math.ceil(
                availableDateList.length /
                DATES_PER_PAGE
            ) -
            1;


        if (
            currentDatePage <
            maxPage
        ) {

            currentDatePage++;

            renderDatePage();

            renderTimes();

        }

    }
);


bookingForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        if (
            !validateStep(4) ||
            !validateStep(3) ||
            !validateStep(2) ||
            !validateStep(1)
        ) {

            return;

        }


        const user =
            auth.currentUser ||
            currentUser;


        if (!user) {

            window.location.replace(
                "/login.html"
            );


            return;

        }


        if (
            hasActiveBooking
        ) {

            showMessage(
                "You already have an active booking. Please complete or cancel it first.",
                "error"
            );


            return;

        }


        const selectedService =
            document.querySelector(
                'input[name="service"]:checked'
            );


        const service =
            selectedService.value;


        const date =
            bookingDate.value;


        const time =
            bookingTime.value;


        const issue =
            description.value.trim();


        const pickupDate =
            getNextBusinessDay(
                date
            );


        const servicePrice =
            SERVICE_PRICES[
                service
            ] ||
            0;


        const slotId =
            `${date}_${time}`;


        const appointmentDate =
            createPhilippineDateTime(
                date,
                time
            );


        const bookingRef =
            doc(
                collection(
                    db,
                    "bookings"
                )
            );


        const lockRef =
            doc(
                db,
                "bookingLocks",
                user.uid
            );


        const slotRef =
            doc(
                db,
                "bookingSlots",
                slotId
            );


        setButtonLoading(
            submitBooking,
            true,
            "Creating Appointment...",
            "Confirm Appointment"
        );


        backStep.disabled =
            true;


        try {

            await runTransaction(
                db,
                async (
                    transaction
                ) => {

                    const lockSnapshot =
                        await transaction.get(
                            lockRef
                        );


                    if (
                        lockSnapshot.exists()
                    ) {

                        throw new Error(
                            "ACTIVE_BOOKING_EXISTS"
                        );

                    }


                    const slotSnapshot =
                        await transaction.get(
                            slotRef
                        );


                    if (
                        slotSnapshot.exists()
                    ) {

                        throw new Error(
                            "SLOT_ALREADY_BOOKED"
                        );

                    }


                    transaction.set(
                        bookingRef,
                        {

                            userId:
                                user.uid,

                            customerName:
                                customerName.value.trim(),

                            email:
                                customerEmail.value.trim(),

                            service:
                                service,

                            servicePrice:
                                servicePrice,

                            date:
                                date,

                            time:
                                time,

                            appointmentAt:
                                Timestamp.fromDate(
                                    appointmentDate
                                ),

                            pickupDate:
                                pickupDate,

                            description:
                                issue,

                            status:
                                "Pending",

                            slotId:
                                slotId,

                            createdAt:
                                serverTimestamp()

                        }
                    );


                    transaction.set(
                        lockRef,
                        {

                            bookingId:
                                bookingRef.id,

                            userId:
                                user.uid,

                            createdAt:
                                serverTimestamp()

                        }
                    );


                    transaction.set(
                        slotRef,
                        {

                            bookingId:
                                bookingRef.id,

                            date:
                                date,

                            time:
                                time,

                            status:
                                "reserved",

                            createdAt:
                                serverTimestamp()

                        }
                    );

                }
            );


            document.getElementById(
                "successService"
            ).textContent =
                service;


            document.getElementById(
                "successDropOff"
            ).textContent =
                `${formatFriendlyDate(
                    date
                )} at ${formatTime(
                    time
                )}`;


            document.getElementById(
                "successPickup"
            ).textContent =
                formatFriendlyDate(
                    pickupDate
                );


            document.getElementById(
                "successMessage"
            ).textContent =
                `Your appointment is pending confirmation. Estimated service price: ${formatPHP(
                    servicePrice
                )}.`;


            document.getElementById(
                "successDetailsLink"
            ).href =
                `/booking-details.html?bookingId=${
                    encodeURIComponent(
                        bookingRef.id
                    )
                }`;


            bookingForm.hidden =
                true;


            activeBookingNotice.hidden =
                true;


            bookingSuccess.hidden =
                false;


            showToast(
                "Appointment created successfully.",
                "success"
            );

        } catch (error) {

            console.error(
                "Booking error:",
                error
            );


            if (
                error.message ===
                "ACTIVE_BOOKING_EXISTS"
            ) {

                hasActiveBooking =
                    true;


                activeBookingNotice.hidden =
                    false;


                showMessage(
                    "You already have an active booking.",
                    "error"
                );

            } else if (
                error.message ===
                "SLOT_ALREADY_BOOKED"
            ) {

                showMessage(
                    "That time was just booked by another customer. Please choose another slot.",
                    "error"
                );


                await refreshSlotsOnce();

            } else if (
                error.code ===
                "permission-denied"
            ) {

                showMessage(
                    "The booking was rejected. Please choose another available appointment.",
                    "error"
                );

            } else {

                showMessage(
                    "Unable to create the booking. Please try again.",
                    "error"
                );

            }

        } finally {

            setButtonLoading(
                submitBooking,
                false,
                "Creating Appointment...",
                "Confirm Appointment"
            );


            backStep.disabled =
                false;

        }

    }
);


function applySlotSnapshot(
    snapshot
) {

    bookedSlotsByDate =
        {};


    snapshot.forEach(
        (item) => {

            const data =
                item.data();


            if (
                !data.date ||
                !data.time
            ) {

                return;

            }


            if (
                !bookedSlotsByDate[
                    data.date
                ]
            ) {

                bookedSlotsByDate[
                    data.date
                ] =
                    new Set();

            }


            bookedSlotsByDate[
                data.date
            ].add(
                data.time
            );

        }
    );


    buildAvailableDatePool();

    renderTimes();

}


function subscribeToSlots() {

    if (
        unsubscribeSlots
    ) {

        unsubscribeSlots();

    }


    unsubscribeSlots =
        onSnapshot(
            collection(
                db,
                "bookingSlots"
            ),

            (snapshot) => {

                applySlotSnapshot(
                    snapshot
                );

            },

            (error) => {

                console.error(
                    "Slot listener error:",
                    error
                );


                dateMessage.textContent =
                    "Unable to load live availability.";


                showToast(
                    "Appointment availability could not be refreshed.",
                    "error"
                );

            }
        );

}


async function refreshSlotsOnce() {

    await new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                450
            )
    );


    buildAvailableDatePool();

}


onAuthStateChanged(
    auth,
    async (user) => {

        authReady =
            true;


        currentUser =
            user;


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


            const profile =
                profileSnapshot.data();


            if (
                profile.role ===
                "admin"
            ) {

                window.location.replace(
                    "/admin-dashboard.html"
                );


                return;

            }


            customerName.value =
                profile.fullName ||
                "";


            customerEmail.value =
                profile.email ||
                user.email ||
                "";


            await checkActiveBooking(
                user
            );


            updateReview();

            subscribeToSlots();

        } catch (error) {

            console.error(
                "Booking auth error:",
                error
            );


            showMessage(
                "Unable to load your booking page. Please try again.",
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
            unsubscribeSlots
        ) {

            unsubscribeSlots();

        }

    }
);


window.addEventListener(
    "pageshow",
    async () => {

        if (
            !authReady ||
            !currentUser ||
            bookingSuccess.hidden === false
        ) {

            return;

        }


        await checkActiveBooking(
            currentUser
        );


        buildAvailableDatePool();

    }
);