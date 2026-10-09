// ============================================================
// RESPawn PC Services
// SHARED REAL-TIME NOTIFICATION CENTER
// ============================================================

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    query,
    runTransaction,
    serverTimestamp,
    updateDoc,
    where
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_NEW_ITEM_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const MAX_VISIBLE_NOTIFICATIONS = 30;

let currentUser = null;
let currentRole = "customer";
let notificationRecords = [];
let notificationError = false;
let notificationErrorCode = "";
let unsubscribeNotifications = null;
let sourceUnsubscribers = [];
let activeCreationKeys = new Set();
let notificationRoot = null;
let notificationsPanel = null;
let notificationTrigger = null;
let notificationList = null;
let unreadBadge = null;
let notificationSummary = null;
let markAllButton = null;
let outsideClickHandlerInstalled = false;

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function millis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === "function") return value.toMillis();
    if (typeof value.seconds === "number") return value.seconds * 1000;
    if (value instanceof Date) return value.getTime();
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

function isRecent(value, windowMs = RECENT_WINDOW_MS) {
    const created = millis(value);
    return created > 0 && Date.now() - created <= windowMs;
}

function relativeTime(value) {
    const time = millis(value);
    if (!time) return "Recently";
    const diff = Math.max(0, Date.now() - time);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(time).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function safeId(value) {
    return String(value || "event")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 150);
}

function notificationIcon(type) {
    if (type === "order" || type === "admin_order") {
        return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><path d="m9 14 2 2 4-4"/></svg>`;
    }
    if (type === "payment") {
        return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h4M8 16h6"/></svg>`;
    }
    if (type === "admin_booking") {
        return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h3"/></svg>`;
    }
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18M8 13l2 2 5-4"/></svg>`;
}

function relativePanelPosition() {
    if (!notificationsPanel || !notificationTrigger || notificationsPanel.hidden) return;
    const rect = notificationTrigger.getBoundingClientRect();
    const width = Math.min(390, window.innerWidth - 16);
    const right = Math.max(8, window.innerWidth - rect.right);
    const maxRight = Math.max(8, window.innerWidth - width - 8);
    const panelMaxHeight = Math.min(560, Math.max(220, window.innerHeight - 100));
    const maxTop = Math.max(8, window.innerHeight - panelMaxHeight - 8);
    notificationsPanel.style.right = `${Math.min(right, maxRight)}px`;
    notificationsPanel.style.top = `${Math.min(rect.bottom + 8, maxTop)}px`;
}

function mountWidget() {
    if (!currentUser) return;
    const isAdminLayout = document.body.classList.contains("admin-body");
    const adminActions = isAdminLayout ? document.querySelector(".admin-topbar-actions") : null;
    const navLinks = document.querySelector(".nav-links");
    const host = adminActions || navLinks;
    if (!host) return;
    const alreadyMounted = document.getElementById("respawnNotificationCenter");
    if (alreadyMounted && alreadyMounted.parentElement === host) return;
    if (alreadyMounted) alreadyMounted.remove();

    const root = document.createElement("div");
    root.id = "respawnNotificationCenter";
    root.className = "respawn-notification-center";
    root.innerHTML = `
        <button type="button" class="respawn-notification-trigger" id="respawnNotificationTrigger" aria-label="Notifications" title="Notifications" aria-haspopup="dialog" aria-expanded="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
            <span class="respawn-notification-badge" id="respawnNotificationBadge" hidden>0</span>
        </button>
        <section class="respawn-notification-panel" id="respawnNotificationPanel" role="dialog" aria-label="Notifications" hidden>
            <header class="respawn-notification-header">
                <div class="respawn-notification-heading">
                    <strong>Notifications</strong>
                    <span id="respawnNotificationSummary">Your latest activity</span>
                </div>
                <button class="respawn-notification-mark-all" id="respawnNotificationMarkAll" type="button">Mark all read</button>
            </header>
            <div class="respawn-notification-list" id="respawnNotificationList" aria-live="polite"></div>
            <footer class="respawn-notification-footer">Booking and store updates appear here in real time.</footer>
        </section>
    `;
    host.appendChild(root);

    notificationRoot = root;
    notificationTrigger = root.querySelector("#respawnNotificationTrigger");
    notificationsPanel = root.querySelector("#respawnNotificationPanel");
    unreadBadge = root.querySelector("#respawnNotificationBadge");
    notificationSummary = root.querySelector("#respawnNotificationSummary");
    notificationList = root.querySelector("#respawnNotificationList");
    markAllButton = root.querySelector("#respawnNotificationMarkAll");

    notificationTrigger.addEventListener("click", () => {
        const open = notificationsPanel.hidden;
        notificationsPanel.hidden = !open;
        notificationTrigger.setAttribute("aria-expanded", String(open));
        if (open) {
            relativePanelPosition();
            renderNotifications();
        }
    });

    markAllButton.addEventListener("click", markAllRead);

    notificationList.addEventListener("click", handleNotificationClick);

    if (!outsideClickHandlerInstalled) {
        document.addEventListener("pointerdown", (event) => {
            const rootNow = document.getElementById("respawnNotificationCenter");
            if (rootNow && !rootNow.contains(event.target)) closePanel();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") closePanel();
        });
        window.addEventListener("resize", relativePanelPosition);
        window.addEventListener("scroll", relativePanelPosition, true);
        outsideClickHandlerInstalled = true;
    }

    renderNotifications();
}

function closePanel() {
    if (!notificationsPanel) return;
    notificationsPanel.hidden = true;
    notificationTrigger?.setAttribute("aria-expanded", "false");
}

function renderNotifications() {
    if (!notificationRoot || !notificationList) return;
    const unread = notificationRecords.filter((item) => !item.read).length;
    unreadBadge.textContent = unread > 99 ? "99+" : String(unread);
    unreadBadge.hidden = unread === 0;
    notificationSummary.textContent = unread === 1 ? "1 unread notification" : `${unread} unread notifications`;
    markAllButton.disabled = unread === 0;

    if (notificationError) {
        notificationList.innerHTML = `<div class="respawn-notification-error">Notifications could not be loaded${notificationErrorCode ? ` (${escapeHTML(notificationErrorCode)})` : ""}. Publish the Firestore rules from the same project, then refresh this page.</div>`;
        return;
    }

    if (!notificationRecords.length) {
        notificationList.innerHTML = `<div class="respawn-notification-empty"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><div><strong>No notifications yet</strong></div><div>Booking and order updates will appear here.</div></div>`;
        return;
    }

    notificationList.innerHTML = notificationRecords.slice(0, MAX_VISIBLE_NOTIFICATIONS).map((item) => {
        const category = item.type === "order" || item.type === "admin_order"
            ? "order"
            : item.type === "payment"
                ? "payment"
                : item.type === "admin_booking"
                    ? "admin"
                    : "booking";
        const target = String(item.targetUrl || "/dashboard.html");
        const safeTarget = target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard.html";
        return `
            <button type="button" class="respawn-notification-item ${item.read ? "" : "is-unread"}" data-notification-id="${escapeHTML(item.id)}" data-target-url="${escapeHTML(safeTarget)}">
                <span class="respawn-notification-icon ${category}">${notificationIcon(item.type)}</span>
                <span class="respawn-notification-copy">
                    <strong>${escapeHTML(item.title || "Update")}</strong>
                    <p>${escapeHTML(item.message || "There is an update to your account.")}</p>
                    <time>${escapeHTML(relativeTime(item.createdAt))}</time>
                </span>
                <span class="respawn-notification-unread-dot" aria-hidden="true"></span>
            </button>
        `;
    }).join("");
}

async function handleNotificationClick(event) {
    const button = event.target.closest("[data-notification-id]");
    if (!button || !currentUser) return;
    const id = button.dataset.notificationId;
    const target = button.dataset.targetUrl || "/dashboard.html";
    try {
        await updateDoc(doc(db, "users", currentUser.uid, "notifications", id), {
            read: true,
            readAt: serverTimestamp()
        });
    } catch (error) {
        console.warn("Unable to mark notification as read:", error);
    }
    const safeTarget = target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard.html";
    window.location.href = safeTarget;
}

async function markAllRead() {
    if (!currentUser) return;
    const unread = notificationRecords.filter((item) => !item.read);
    if (!unread.length) return;
    markAllButton.disabled = true;
    try {
        await Promise.all(unread.map((item) => updateDoc(
            doc(db, "users", currentUser.uid, "notifications", item.id),
            { read: true, readAt: serverTimestamp() }
        )));
    } catch (error) {
        console.error("Unable to mark all notifications as read:", error);
    } finally {
        markAllButton.disabled = false;
    }
}

function stopListeners() {
    if (unsubscribeNotifications) {
        unsubscribeNotifications();
        unsubscribeNotifications = null;
    }
    sourceUnsubscribers.forEach((unsubscribe) => unsubscribe());
    sourceUnsubscribers = [];
    activeCreationKeys = new Set();
}

function removeWidget() {
    document.getElementById("respawnNotificationCenter")?.remove();
    notificationRoot = null;
    notificationsPanel = null;
    notificationTrigger = null;
    notificationList = null;
    unreadBadge = null;
    notificationSummary = null;
    markAllButton = null;
}

async function ensureNotification(targetUid, id, data) {
    const stableId = safeId(id);
    const key = `${targetUid}/${stableId}`;
    if (activeCreationKeys.has(key)) return;
    activeCreationKeys.add(key);
    const notificationRef = doc(db, "users", targetUid, "notifications", stableId);
    try {
        await runTransaction(db, async (transaction) => {
            const existing = await transaction.get(notificationRef);
            if (existing.exists()) return;
            transaction.set(notificationRef, {
                userId: targetUid,
                title: data.title,
                message: data.message,
                type: data.type,
                targetUrl: data.targetUrl,
                sourceType: data.sourceType,
                sourceId: data.sourceId,
                eventKey: stableId,
                read: false,
                createdAt: serverTimestamp()
            });
        });
    } catch (error) {
        activeCreationKeys.delete(key);
        console.warn("Unable to create notification:", error);
    }
}

function bookingStatusCopy(booking) {
    const status = String(booking.status || "Pending");
    const service = booking.service || "your PC service";
    if (status === "Pending") {
        return { title: "Booking request received", message: `Your ${service} request is awaiting confirmation.` };
    }
    if (status === "Confirmed") {
        return { title: "Booking confirmed", message: `Your ${service} appointment has been confirmed.` };
    }
    if (status === "Completed") {
        return { title: "Service completed", message: `Your ${service} service has been marked completed.` };
    }
    if (status === "Cancelled") {
        return { title: "Booking cancelled", message: `Your ${service} booking has been cancelled.` };
    }
    return { title: "Booking updated", message: `Your ${service} booking status is now ${status}.` };
}

function orderStatusCopy(order) {
    const status = String(order.orderStatus || "Pending");
    const number = order.orderNumber || order.id || "your order";
    if (status === "Pending") return { title: "Order received", message: `${number} has been received and is awaiting confirmation.` };
    if (status === "Confirmed") return { title: "Order confirmed", message: `${number} has been confirmed by Respawn.` };
    if (status === "Processing") return { title: "Order being prepared", message: `${number} is being prepared.` };
    if (status === "Ready for Pickup") return { title: "Order ready for pickup", message: `${number} is ready for pickup.` };
    if (status === "Completed") return { title: "Order completed", message: `${number} has been marked completed.` };
    if (status === "Cancelled") return { title: "Order cancelled", message: `${number} has been cancelled.` };
    return { title: "Order updated", message: `${number} status is now ${status}.` };
}

async function notifyCustomerBooking(bookingId, booking) {
    if (!booking.userId) return;
    const status = String(booking.status || "Pending");
    if (isRecent(booking.createdAt) || status !== "Pending") {
        const copy = bookingStatusCopy(booking);
        await ensureNotification(
            booking.userId,
            `booking_${bookingId}_status_${status}`,
            {
                ...copy,
                type: "booking",
                targetUrl: `/booking-details.html?bookingId=${encodeURIComponent(bookingId)}`,
                sourceType: "booking",
                sourceId: bookingId
            }
        );
    }
    if (booking.payment?.status === "Paid") {
        await ensureNotification(
            booking.userId,
            `booking_${bookingId}_payment_paid`,
            {
                title: "Payment recorded",
                message: `Payment for ${booking.service || "your service"} has been recorded. Your receipt is available.`,
                type: "payment",
                targetUrl: `/receipt.html?bookingId=${encodeURIComponent(bookingId)}`,
                sourceType: "booking",
                sourceId: bookingId
            }
        );
    }
}

async function notifyCustomerOrder(orderId, order) {
    if (!order.userId) return;
    const status = String(order.orderStatus || "Pending");
    if (isRecent(order.createdAt) || status !== "Pending") {
        const copy = orderStatusCopy({ ...order, id: orderId });
        await ensureNotification(
            order.userId,
            `order_${orderId}_status_${status}`,
            {
                ...copy,
                type: "order",
                targetUrl: `/my-orders.html?notificationOrderId=${encodeURIComponent(orderId)}`,
                sourceType: "order",
                sourceId: orderId
            }
        );
    }
    if (order.paymentStatus === "Paid") {
        await ensureNotification(
            order.userId,
            `order_${orderId}_payment_paid`,
            {
                title: "Payment recorded",
                message: `Payment for ${order.orderNumber || "your store order"} has been marked as paid.`,
                type: "payment",
                targetUrl: `/my-orders.html?notificationOrderId=${encodeURIComponent(orderId)}`,
                sourceType: "order",
                sourceId: orderId
            }
        );
    }
}

function listenForCustomerEvents(user) {
    const bookingsQuery = query(collection(db, "bookings"), where("userId", "==", user.uid));
    const ordersQuery = query(collection(db, "orders"), where("userId", "==", user.uid));

    sourceUnsubscribers.push(onSnapshot(bookingsQuery, (snapshot) => {
        snapshot.docs.forEach((snapshotDoc) => {
            void notifyCustomerBooking(snapshotDoc.id, snapshotDoc.data());
        });
    }, (error) => console.warn("Booking notification feed error:", error)));

    sourceUnsubscribers.push(onSnapshot(ordersQuery, (snapshot) => {
        snapshot.docs.forEach((snapshotDoc) => {
            void notifyCustomerOrder(snapshotDoc.id, snapshotDoc.data());
        });
    }, (error) => console.warn("Order notification feed error:", error)));
}

function listenForAdminEvents(user) {
    sourceUnsubscribers.push(onSnapshot(collection(db, "bookings"), (snapshot) => {
        snapshot.docs.forEach((snapshotDoc) => {
            const booking = snapshotDoc.data();
            const bookingId = snapshotDoc.id;
            void notifyCustomerBooking(bookingId, booking);
            if (booking.userId && isRecent(booking.createdAt, ADMIN_NEW_ITEM_WINDOW_MS)) {
                void ensureNotification(
                    user.uid,
                    `admin_new_booking_${bookingId}`,
                    {
                        title: "New repair booking",
                        message: `${booking.customerName || "A customer"} submitted ${booking.service || "a service"} request.`,
                        type: "admin_booking",
                        targetUrl: `/admin-dashboard.html#bookingsSection`,
                        sourceType: "booking",
                        sourceId: bookingId
                    }
                );
            }
        });
    }, (error) => console.warn("Admin booking notification feed error:", error)));

    sourceUnsubscribers.push(onSnapshot(collection(db, "orders"), (snapshot) => {
        snapshot.docs.forEach((snapshotDoc) => {
            const order = snapshotDoc.data();
            const orderId = snapshotDoc.id;
            void notifyCustomerOrder(orderId, order);
            if (order.userId && isRecent(order.createdAt, ADMIN_NEW_ITEM_WINDOW_MS)) {
                void ensureNotification(
                    user.uid,
                    `admin_new_order_${orderId}`,
                    {
                        title: "New store order",
                        message: `${order.customerName || "A customer"} placed ${order.orderNumber || "a new order"} worth ${new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(order.total) || 0)}.`,
                        type: "admin_order",
                        targetUrl: `/admin-orders.html`,
                        sourceType: "order",
                        sourceId: orderId
                    }
                );
            }
        });
    }, (error) => console.warn("Admin order notification feed error:", error)));
}

function watchUserNotifications(user) {
    const notificationCollection = collection(db, "users", user.uid, "notifications");
    unsubscribeNotifications = onSnapshot(notificationCollection, (snapshot) => {
        notificationError = false;
        notificationErrorCode = "";
        notificationRecords = snapshot.docs.map((snapshotDoc) => ({
            id: snapshotDoc.id,
            ...snapshotDoc.data()
        })).sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
        renderNotifications();
    }, (error) => {
        console.error("Notification subscription failed:", error);
        notificationError = true;
        notificationErrorCode = error?.code || "unknown-error";
        renderNotifications();
    });
}

async function setupForUser(user) {
    stopListeners();
    currentUser = user;
    notificationRecords = [];
    notificationError = false;
    notificationErrorCode = "";
    mountWidget();
    renderNotifications();

    try {
        const profileSnapshot = await getDoc(doc(db, "users", user.uid));
        currentRole = profileSnapshot.exists() && profileSnapshot.data().role === "admin" ? "admin" : "customer";
    } catch (error) {
        console.warn("Could not resolve notification role:", error);
        currentRole = "customer";
    }

    mountWidget();
    watchUserNotifications(user);
    if (currentRole === "admin") {
        listenForAdminEvents(user);
    } else {
        listenForCustomerEvents(user);
    }
}

function installRemountObserver() {
    const observer = new MutationObserver(() => {
        if (currentUser) mountWidget();
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

installRemountObserver();

onAuthStateChanged(auth, (user) => {
    if (!user) {
        currentUser = null;
        currentRole = "customer";
        notificationRecords = [];
        stopListeners();
        removeWidget();
        return;
    }
    void setupForUser(user).catch((error) => {
        console.error("Notification center setup failed:", error);
    });
});
