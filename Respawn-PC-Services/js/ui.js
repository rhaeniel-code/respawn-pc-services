// ============================================================
// RESPawn PC Services
// SHARED UI HELPERS
// ============================================================


export function escapeHTML(
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


// ============================================================
// FORMAT DATE
// ============================================================

export function formatDate(
    dateString,
    options = {}
) {

    if (!dateString) {

        return "Not specified";

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


    return date.toLocaleDateString(
        "en-US",
        {

            weekday:
                options.weekday ||
                "long",

            month:
                options.month ||
                "long",

            day:
                options.day ||
                "numeric",

            year:
                options.year ||
                "numeric",

            timeZone:
                "UTC"

        }
    );

}


// ============================================================
// FORMAT TIME
// ============================================================

export function formatTime(
    timeString
) {

    if (!timeString) {

        return "";

    }


    const [
        hour,
        minute
    ] =
        timeString
            .split(":")
            .map(Number);


    const suffix =
        hour >= 12
            ? "PM"
            : "AM";


    let displayHour =
        hour % 12;


    if (
        displayHour === 0
    ) {

        displayHour =
            12;

    }


    return (
        `${displayHour}:` +
        `${String(
            minute
        ).padStart(
            2,
            "0"
        )} ` +
        suffix
    );

}


// ============================================================
// FORMAT TIMESTAMP
// ============================================================

export function formatTimestamp(
    timestamp,
    includeTime = true
) {

    if (
        !timestamp?.seconds
    ) {

        return "Not recorded";

    }


    return new Date(
        timestamp.seconds *
        1000
    ).toLocaleString(
        "en-US",
        {

            dateStyle:
                "medium",

            ...(includeTime
                ? {
                    timeStyle:
                        "short"
                }
                : {})

        }
    );

}


// ============================================================
// FORMAT PHP
// ============================================================

export function formatPHP(
    amount
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
            amount
        ) ||
        0
    );

}


// ============================================================
// STATUS CLASS
// ============================================================

export function statusClass(
    status
) {

    return (
        `status-badge status-${String(
            status ||
            "pending"
        ).toLowerCase()}`
    );

}


// ============================================================
// TOAST NOTIFICATION
// ============================================================

export function showToast(
    message,
    type = "info"
) {

    let container =
        document.getElementById(
            "toastContainer"
        );


    if (!container) {

        container =
            document.createElement(
                "div"
            );

        container.id =
            "toastContainer";

        container.className =
            "toast-container";

        document.body.appendChild(
            container
        );

    }


    const toast =
        document.createElement(
            "div"
        );


    toast.className =
        `toast toast-${type}`;


    const icon =
        document.createElement(
            "span"
        );


    icon.className =
        "toast-icon";


    icon.textContent =
        type === "success"
            ? "✓"
            : type === "error"
                ? "!"
                : "i";


    const text =
        document.createElement(
            "span"
        );


    text.className =
        "toast-text";


    text.textContent =
        message;


    toast.append(
        icon,
        text
    );


    container.appendChild(
        toast
    );


    requestAnimationFrame(
        () => {

            toast.classList.add(
                "show"
            );

        }
    );


    window.setTimeout(
        () => {

            toast.classList.remove(
                "show"
            );


            window.setTimeout(
                () => {

                    toast.remove();

                },
                250
            );

        },
        3600
    );

}


// ============================================================
// BUTTON LOADING
// ============================================================

export function setButtonLoading(
    button,
    loading,
    loadingText,
    normalText
) {

    if (!button) {

        return;

    }


    button.disabled =
        loading;


    button.textContent =
        loading
            ? loadingText
            : normalText;

}