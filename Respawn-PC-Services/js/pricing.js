// ============================================================
// RESPawn PC Services
// SERVICE PRICES
// ============================================================


export const SERVICE_PRICES = {

    "Gamer Rig Deep Cleaning":
        500,

    "Thermal Paste Replacement":
        700,

    "Diagnostic Checks":
        300

};


export function getServicePrice(
    service
) {

    return Number(
        SERVICE_PRICES[
            service
        ] ||
        0
    );

}


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
        Number(amount) ||
        0
    );

}