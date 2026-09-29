// ===== DEVELOPER 1 MODULE: Home, Check Ticket, About Us, Authentication =====
// Functions below are extracted verbatim from the main script.js.

let activeUser = JSON.parse(localStorage.getItem('dola_user')) || null;
let registeredUsers = JSON.parse(localStorage.getItem('dola_users')) || [];   // demo account store

// Pages that need a login. Everything else (Home, Book Ticket search/seats, About, Counters) is open to guests.
const protectedViews = ['view-lookup', 'view-mybookings'];
let pendingView = null;   // page the guest wanted to open before being asked to log in

// Set Default Date to Tomorrow (Home search widget) & restore the login state
document.addEventListener('DOMContentLoaded', () => {
    const searchDateInput = document.getElementById('search-date');
    if (searchDateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        searchDateInput.value = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;
    }
    updateUserUI();
});

// --- SPA VIEW CONTROLLER ---
function switchView(viewId) {
    // Guests must log in before opening Check Ticket or My Bookings
    if (protectedViews.includes(viewId) && !activeUser) {
        pendingView = viewId;
        openAuthModal('Please login or register to access this page.');
        return;
    }

    document.querySelectorAll('.spa-view').forEach(view => view.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

    const targetView = document.getElementById(viewId);
    if (targetView) targetView.classList.add('active');

    const activeNav = document.querySelector(`.nav-item[data-view="${viewId}"]`);
    if (activeNav) activeNav.classList.add('active');

    if (viewId === 'view-booking') {
        const destSelect = document.getElementById('search-to');
        const destVal = destSelect ? destSelect.value : 'All';
        filterAndRenderSchedules(destVal, 'All');
    } else if (viewId === 'view-mybookings') {
        renderMyBookings();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// --- HERO SEARCH HANDLER ---
function handleHeroSearch(event) {
    if (event) event.preventDefault();
    const destSelect = document.getElementById('search-to');
    const classSelect = document.getElementById('search-class');
    
    const destination = destSelect ? destSelect.value : 'All';
    const coachType = classSelect ? classSelect.value : 'All';

    filterAndRenderSchedules(destination, coachType);
    switchView('view-booking');
}

function selectDestination(destination) {
    const destSelect = document.getElementById('search-to');
    if (destSelect) destSelect.value = destination;
    filterAndRenderSchedules(destination, 'All');
    switchView('view-booking');
}

// --- SHARED HELPERS ---
// Escape text before putting it inside innerHTML
function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// JSON that is safe inside a single-quoted onclick attribute
function attrJSON(obj) {
    return esc(JSON.stringify(obj));
}

// --- TICKET LOOKUP FUNCTIONALITY ---
function toggleLookupInput() {
    const type = document.getElementById('lookup-type').value;
    const label = document.getElementById('lookup-label');
    label.innerText = type === 'ref' ? 'Booking Reference ID' : 'Passenger Mobile Number';
}

function handleTicketSearch(event) {
    if (event) event.preventDefault();
    const type = document.getElementById('lookup-type').value;
    const value = document.getElementById('lookup-value').value.trim();
    const container = document.getElementById('lookup-result-container');

    const history = JSON.parse(localStorage.getItem('dola_bookings')) || [];
    const match = history.find(b => type === 'ref' ? b.refId.toLowerCase() === value.toLowerCase() : b.phone === value);

    if (match) {
        container.innerHTML = `
            <div class="card-box" style="background:#e3fcef; border: 1px solid var(--primary);">
                <h3>Ticket Found (${match.refId})</h3>
                <p><strong>Passenger:</strong> ${esc(match.passengerName)} (${esc(match.phone)})</p>
                <p><strong>Route:</strong> ${match.route} | <strong>Seats:</strong> ${match.seats}</p>
                <p><strong>Date & Time:</strong> ${match.date} at ${match.time}</p>
                <button class="btn btn-sm btn-primary" style="margin-top:10px;" onclick="openETicketModal(${attrJSON(match)})">View Full E-Ticket 🎟️</button>
            </div>
        `;
    } else {
        container.innerHTML = `<p class="text-center text-muted">No booking record found for "${esc(value)}".</p>`;
    }
}

// --- AUTHENTICATION MODAL & LOGIC ---
// Optional "message" explains why the guest is being asked to log in
function openAuthModal(message) {
    const msgBox = document.getElementById('auth-message');
    if (msgBox) {
        // authBtn.onclick passes a click event here, so only accept real text
        if (typeof message === 'string' && message) {
            msgBox.innerText = message;
            msgBox.style.display = 'block';
        } else {
            msgBox.style.display = 'none';
        }
    }
    document.getElementById('auth-modal').classList.add('active');
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
    pendingView = null;   // guest cancelled, forget the page they wanted
}

function switchAuthTab(tab) {
    if (tab === 'login') {
        document.getElementById('form-login').style.display = 'block';
        document.getElementById('form-register').style.display = 'none';
        document.getElementById('tab-login-btn').classList.add('active');
        document.getElementById('tab-register-btn').classList.remove('active');
    } else {
        document.getElementById('form-login').style.display = 'none';
        document.getElementById('form-register').style.display = 'block';
        document.getElementById('tab-register-btn').classList.add('active');
        document.getElementById('tab-login-btn').classList.remove('active');
    }
}

// Runs after a successful login/registration
function finishLogin() {
    localStorage.setItem('dola_user', JSON.stringify(activeUser));
    updateUserUI();
    prefillPassengerDetails();          // fill the booking form if it is open

    const target = pendingView;         // read before closeAuthModal clears it
    closeAuthModal();
    if (target) switchView(target);     // take them to the page they originally clicked
}

function handleLogin(event) {
    if (event) event.preventDefault();
    const phone = document.getElementById('login-phone').value.trim();
    const pass = document.getElementById('login-pass').value;

    // Demo only: accounts live in the browser's localStorage
    const account = registeredUsers.find(u => u.phone === phone && u.pass === pass);
    if (!account) {
        alert('Incorrect mobile number or password. New here? Please register first.');
        return;
    }

    activeUser = { name: account.name, phone: account.phone };
    finishLogin();
}

function handleRegister(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('reg-name').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const pass = document.getElementById('reg-pass').value;

    if (registeredUsers.some(u => u.phone === phone)) {
        alert('This mobile number is already registered. Please login instead.');
        return;
    }

    registeredUsers.push({ name, phone, pass });
    localStorage.setItem('dola_users', JSON.stringify(registeredUsers));

    activeUser = { name, phone };
    finishLogin();
}

function updateUserUI() {
    if (activeUser) {
        const userDisplay = document.getElementById('user-display');
        const userNameSpan = document.getElementById('user-name-span');
        const authBtn = document.getElementById('auth-btn');

        if (userDisplay) userDisplay.style.display = 'inline';
        if (userNameSpan) userNameSpan.innerText = activeUser.name;
        if (authBtn) {
            authBtn.innerText = 'Logout';
            authBtn.onclick = logoutUser;
        }
    }
}

function logoutUser() {
    localStorage.removeItem('dola_user');
    activeUser = null;
    const userDisplay = document.getElementById('user-display');
    const authBtn = document.getElementById('auth-btn');

    if (userDisplay) userDisplay.style.display = 'none';
    if (authBtn) {
        authBtn.innerText = 'Login / Register';
        authBtn.onclick = openAuthModal;
    }

    // Clear the auto-filled passenger details
    const nameField = document.getElementById('p-name');
    const phoneField = document.getElementById('p-phone');
    if (nameField) nameField.value = '';
    if (phoneField) phoneField.value = '';

    // Leave login-only pages after logging out
    const current = document.querySelector('.spa-view.active');
    if (current && protectedViews.includes(current.id)) switchView('view-home');
}


// ==========================================================================
// STANDALONE STUBS (Developer 2's module is not loaded in this file-set).
// These let Developer 1's pages run on their own. DELETE this block at merge:
// the real versions live in Developer 2's script.js.
// ==========================================================================
function filterAndRenderSchedules(destination, coachType) { /* booking list lives in Developer 2's module */ }
function prefillPassengerDetails() { /* passenger form lives in Developer 2's module */ }
function renderMyBookings() { /* My Bookings lives in Developer 2's module */ }
function openETicketModal(record) {
    alert('E-Ticket viewer belongs to Developer 2\'s module.\nTicket found: ' + record.refId + ' | ' + record.route + ' | Seats: ' + record.seats);
}
// Demo booking so "Check Ticket" can be tried without the booking module (search DOLA-100001 or 01700000000)
if (!localStorage.getItem('dola_bookings')) {
    localStorage.setItem('dola_bookings', JSON.stringify([{
        refId: 'DOLA-100001', passengerName: 'Demo Passenger', phone: '01700000000',
        route: 'Dhaka to Khulna', date: '2026-10-01', time: '07:30 AM', seats: 'A1, A2',
        boarding: 'Sayedabad Counter', dropping: 'Sonadanga Terminal', amount: 'BDT 1600'
    }]));
}
