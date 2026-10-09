# Respawn PC Services

## 1. Business Name and Description

**Business Name:** Respawn PC Services

**Description:** Respawn PC Services is a web-based platform for a gaming PC repair and maintenance business. Customers can book repair and maintenance appointments, monitor booking status, view payment receipts, and purchase PC components and accessories through an integrated online store. Administrators manage bookings, customers, payments, products, inventory, and store orders.

**Target Users:**
- **Customers:** Gamers and PC owners who need repair, maintenance, or PC components.
- **Administrators:** Staff responsible for managing appointments, customer records, payments, inventory, and orders.

## 2. Problem Being Solved

Repair businesses may rely on manual appointment scheduling, separate customer records, and spreadsheets for stock and order management. These processes can cause scheduling conflicts, difficulty tracking service progress, and inaccurate inventory records.

Respawn PC Services provides a centralized web application for repair appointments and PC component sales. It helps customers check their bookings and orders while allowing administrators to manage business activities from one dashboard.

## 3. Features

### Public Website
- Business landing page and service information.
- Service pricing.
- Account registration and login.
- PC components and accessories store.

### Customer Features
- Register and log in using Firebase Authentication.
- View the customer dashboard and profile.
- Create repair and maintenance bookings.
- View booking status and appointment details.
- View payment status and receipts.
- Browse, search, and filter store products.
- Add products to a shopping cart.
- Place store orders and review order history.
- Receive in-app notifications when supported events are recorded.

### Administrator Features
- Role-based administrator access.
- View and manage customer bookings.
- Update booking status.
- View customer information.
- Record payments manually.
- Generate and view payment receipts.
- Add, edit, and delete store products.
- Manage product prices and stock quantities.
- View and manage customer store orders.
- View inventory summaries and low-stock information.
- Access relevant in-app notifications.

### CRUD Operations
- **Create:** Customer accounts, repair bookings, products, and store orders.
- **Read:** Customer profiles, bookings, products, order records, payments, and notifications according to access permissions.
- **Update:** Booking status, product information, inventory, order status, and payment records.
- **Delete:** Store products and other records where the application provides an authorized delete action.

### Payment Limitation
Payment recording is intended for the project demonstration. Administrators can manually record payment information, including the payment method and receipt number. GCash and Maya are not connected to a live payment gateway.

## 4. Technology Stack

- HTML5
- CSS3
- JavaScript using ES modules
- Firebase Authentication
- Cloud Firestore
- Firebase Hosting
- Firebase CLI
- External product image URLs

## 5. Project Structure

```text
Respawn-PC-Services/
├── index.html
├── login.html
├── register.html
├── dashboard.html
├── booking.html
├── my-bookings.html
├── admin-dashboard.html
├── admin-products.html
├── admin-orders.html
├── store.html
├── product.html
├── cart.html
├── checkout.html
├── my-orders.html
├── receipt.html
├── firebase.json
├── .firebaserc
├── firestore.rules
├── css/
│   └── style.css
└── js/
    ├── firebase.js
    ├── auth.js
    ├── dashboard.js
    ├── booking.js
    ├── my-bookings.js
    ├── admin-dashboard.js
    ├── pricing.js
    ├── receipt.js
    └── [other JavaScript modules]
```

Note: The files shown above are examples of the main project files. Refer to the actual repository for the complete source code.

## 6. Setup and Run Instructions

### Requirements
- A computer with internet access.
- Git.
- Node.js and npm.
- Firebase CLI.
- Access to the configured Firebase project, or a separately configured Firebase project for testing.

### Clone the Repository

Replace `YOUR-GITHUB-USERNAME` with the repository owner's GitHub username.

```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/respawn-pc-services.git
cd respawn-pc-services
```

### Install Firebase CLI

```bash
npm install -g firebase-tools
```

### Sign In to Firebase

```bash
firebase login
```

### Preview the Website Locally

```bash
firebase emulators:start --only hosting --project respawn-a7bb6
```

Open the local URL printed by the Firebase CLI, typically:

`http://127.0.0.1:5000`

The frontend uses the Firebase configuration in `js/firebase.js`. Unless Firebase Authentication and Firestore are separately configured to use local emulators, the application will connect to the configured Firebase services.

### Deploy the Website

Only project collaborators with the required Firebase permissions should deploy:

```bash
firebase deploy --only hosting,firestore:rules --project respawn-a7bb6
```

### Firebase Configuration

For an independent Firebase setup:

1. Create or select a Firebase project.
2. Register a Firebase web application.
3. Enable Email/Password Authentication.
4. Create a Cloud Firestore database.
5. Configure `js/firebase.js` with the appropriate web application configuration.
6. Configure `.firebaserc` for the intended project.
7. Publish the supplied `firestore.rules`.
8. Create the administrator and customer test accounts described below.

**Testing note:** Before submission, verify the clone-and-run procedure on a clean machine or a separate folder. Confirm that login, booking, product browsing, checkout, administrator functions, and receipts work with the configured Firebase project.

## 7. AI Tools Used

**OpenAI ChatGPT**

ChatGPT was used as an AI-assisted development tool for:
- Troubleshooting JavaScript and Firebase integration.
- Assistance with HTML, CSS, and JavaScript implementation.
- Developing and reviewing Firestore security rule drafts.
- Improving page layouts and responsive user interfaces.
- Assisting with the store, booking, payment, receipt, and notification workflows.
- Preparing project documentation and setup instructions.

The project developer remains responsible for reviewing the generated code, verifying functionality, and understanding the implementation. AI assistance should be disclosed in accordance with the instructor's academic integrity policy.

## 8. Test Accounts

Use dedicated demonstration accounts with no personal or sensitive data. Do not publish the password for a real administrator account or reuse a personal password.

Fill in the actual test credentials before submitting this README:

| Account | Email | Password |
|---|---|---|
| Administrator | [Enter demo admin email] | [Enter demo admin password] |
| Regular Customer | [Enter demo customer email] | [Enter demo customer password] |

### Administrator Account Setup

1. Create the demo administrator in Firebase Authentication.
2. Obtain that account's Firebase UID.
3. In Firestore, create or update `users/{UID}`.
4. Set the document's `uid`, `email`, and `fullName` fields appropriately.
5. Set `role` to `admin`.

### Customer Account Setup

Create a separate customer account using the website's registration page or Firebase Authentication. Its matching Firestore user document should have `role` set to `customer`.

Confirm that both accounts can log in and that the administrator is redirected to the administrator dashboard while the customer is redirected to the customer dashboard.

## 9. Live Website

https://respawn-a7bb6.web.app

