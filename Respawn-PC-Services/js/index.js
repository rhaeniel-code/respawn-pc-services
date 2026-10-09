// ============================================================
// RESPawn PC Services
// PUBLIC LANDING PAGE
// ============================================================

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
    auth
} from "./firebase.js";

import {
    SERVICE_PRICES,
    formatPHP
} from "./pricing.js";


const navLinks =
    document.getElementById(
        "mainNavLinks"
    );


const heroBookingLink =
    document.getElementById(
        "heroBookingLink"
    );


function renderServices() {

    document
        .querySelectorAll(
            ".service-price"
        )
        .forEach(
            (element) => {

                const service =
                    element.dataset.service;


                element.textContent =
                    formatPHP(
                        SERVICE_PRICES[
                            service
                        ] ||
                        0
                    );

            }
        );

}


function renderNavigation(
    user
) {

    if (user) {

        navLinks.innerHTML = `

            <a href="/index.html">
                Home
            </a>

            <a href="/dashboard.html">
                Dashboard
            </a>

            <a href="/my-bookings.html">
                My Bookings
            </a>

            <a href="/store.html">
                PC Store
            </a>

            <a
                href="/booking.html"
                class="nav-button"
            >
                Book a Service
            </a>

        `;


        heroBookingLink.textContent =
            "Book a Service";


        heroBookingLink.href =
            "/booking.html";

    } else {

        navLinks.innerHTML = `

            <a href="/index.html">
                Home
            </a>

            <a href="/store.html">
                PC Store
            </a>

            <a href="/login.html">
                Login
            </a>

            <a
                href="/register.html"
                class="nav-button"
            >
                Create Account
            </a>

        `;


        heroBookingLink.textContent =
            "Book a Diagnostic";


        heroBookingLink.href =
            "/login.html";

    }

}


renderServices();

onAuthStateChanged(
    auth,
    renderNavigation
);