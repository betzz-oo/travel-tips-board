import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-analytics.js";

// --- 1. FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: "AIzaSyBSwgE-9N9pDeb7ghNRbjQmTvtRUsJG6oo",
    authDomain: "travel-tip-5b9f2.firebaseapp.com",
    projectId: "travel-tip-5b9f2",
    storageBucket: "travel-tip-5b9f2.firebasestorage.app",
    messagingSenderId: "619005955024",
    appId: "1:619005955024:web:ce60f6a0d0c9329d5b07d5",
    measurementId: "G-F02QRZRMTX"
};

// --- 2. INITIALIZE FIREBASE ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Configuration Constants
const COLLECTION_NAME = 'travel_tips';

console.log("🔥 Firebase initialized for Project ID:", firebaseConfig.projectId);
console.log("📦 Using Firestore Collection:", COLLECTION_NAME);

// --- 3. DOM ELEMENTS ---
const tipForm = document.getElementById('tipForm');
const submitBtn = document.getElementById('submitBtn');
const tipsContainer = document.getElementById('tipsContainer');
const filterCategory = document.getElementById('filterCategory');
const filterCity = document.getElementById('filterCity');
const filterCountry = document.getElementById('filterCountry');
const filterLocation = document.getElementById('filterLocation');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

// Store fetched tips in memory for easy filtering
let allTips = [];

// --- 4. FUNCTIONS ---

// Function to handle form submission and save data to Firestore
async function saveTip(event) {
    event.preventDefault(); // Prevent page reload
    console.log("SUBMIT CLICKED - Starting saveTip function");

    // Get values from form
    const cityInput = document.getElementById('city').value.trim();
    const countryInput = document.getElementById('country').value;
    const locationInput = document.getElementById('location').value.trim();
    const categoryInput = document.getElementById('category').value;
    const contentInput = document.getElementById('tipContent').value.trim();
    const authorInput = document.getElementById('authorName').value.trim();
    const emailInput = document.getElementById('authorEmail').value.trim();
    const proofInput = document.getElementById('proofOfVisit').value.trim();

    console.log("Form Data Captured:", {
        city: cityInput,
        country: countryInput,
        location: locationInput,
        category: categoryInput,
        content: contentInput,
        author: authorInput,
        email: emailInput,
        proof: proofInput
    });

    // Prepare data object
    const newTip = {
        city: cityInput,
        country: countryInput,
        location: locationInput,
        category: categoryInput,
        content: contentInput,
        authorName: authorInput,
        authorEmail: emailInput,
        proofOfVisit: proofInput,
        timestamp: serverTimestamp() // Let Firestore handle the exact time
    };

    try {
        // Disable button to prevent double submission
        submitBtn.disabled = true;
        submitBtn.textContent = "Sharing...";

        console.log(`Saving to Firestore collection '${COLLECTION_NAME}'...`);

        // Add document to collection
        const docRef = await addDoc(collection(db, COLLECTION_NAME), newTip);

        console.log("Document successfully written with ID:", docRef.id);
        alert("Success! Your travel tip has been shared.");

        // Reset form
        tipForm.reset();

        // Re-fetch tips to show the new one
        console.log("Re-fetching tips after successful save...");
        await fetchTips();

    } catch (error) {
        console.error("CRITICAL ERROR adding tip to Firestore:", error);
        alert("Sorry, there was an error saving your tip: " + error.message);
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = "Share Tip";
    }
}

// Function to fetch tips from Firestore
async function fetchTips() {
    try {
        console.log(`Fetching from Firestore collection '${COLLECTION_NAME}'...`);
        // Fetch from collection, order by timestamp descending (newest first)
        const q = query(collection(db, COLLECTION_NAME), orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(q);

        allTips = []; // Reset array

        querySnapshot.forEach(doc => {
            const tipData = doc.data();
            // Store doc.id if we needed to delete/edit later
            allTips.push({ id: doc.id, ...tipData });
        });

        console.log(`Successfully fetched ${allTips.length} tips from '${COLLECTION_NAME}'.`);

        // Display them
        renderTips();

    } catch (error) {
        console.error("Error fetching tips: ", error);
        tipsContainer.innerHTML = '<div class="no-tips-msg">Error loading tips. Check console.</div>';
    }
}

// Function to render HTML for tips based on current filter
function renderTips() {
    tipsContainer.innerHTML = ''; // Clear container

    const selectedCategory = filterCategory.value;
    const selectedCountry = filterCountry.value;
    const cityQuery = filterCity.value.toLowerCase().trim();
    const locationQuery = filterLocation.value.toLowerCase().trim();

    // Filter tips array
    const filteredTips = allTips.filter(tip => {
        // 1. Category Filter (Exact match or 'All')
        const matchesCategory = selectedCategory === 'All' || tip.category === selectedCategory;
        
        // 2. Country Filter (Dropdown match or check 'location' fallback for old data)
        const tipCountry = (tip.country || '').toLowerCase();
        const tipLocation = (tip.location || '').toLowerCase();
        const matchesCountry = selectedCountry === 'All' || 
                               tip.country === selectedCountry || 
                               (!tip.country && tipLocation.includes(selectedCountry.toLowerCase()));

        // 3. City Filter (Search in 'city' OR 'location' fallback)
        const tipCity = (tip.city || '').toLowerCase();
        const matchesCity = !cityQuery || 
                            tipCity.includes(cityQuery) || 
                            (!tip.city && tipLocation.includes(cityQuery));

        // 4. Spot Filter (Search in 'location' field, which represents the spot in new data)
        const matchesLocation = !locationQuery || tipLocation.includes(locationQuery);
        
        return matchesCategory && matchesCountry && matchesCity && matchesLocation;
    });

    if (filteredTips.length === 0) {
        let message = 'No tips found matching your search combination. Try removing some filters.';
        if (selectedCategory === 'All' && selectedCountry === 'All' && !cityQuery && !locationQuery) {
            message = 'No tips shared yet. Be the first to share one!';
        }
        tipsContainer.innerHTML = `<div class="no-tips-msg">${message}</div>`;
        return;
    }

    // Generate HTML for each tip
    filteredTips.forEach(tip => {
        // Format timestamp nicely
        let timeString = 'Just now';
        if (tip.timestamp) {
            // Convert Firestore Timestamp to JS Date
            const date = tip.timestamp.toDate();
            timeString = date.toLocaleDateString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric'
            });
        }

        let proofHTML = '';
        if (tip.proofOfVisit) {
            // simple check if it looks like an image URL
            if (tip.proofOfVisit.match(/\.(jpeg|jpg|gif|png|webp|avif)(\?.*)?$/i)) {
                proofHTML = `<img src="${escapeHTML(tip.proofOfVisit)}" alt="Proof of visit" class="tip-proof-img" loading="lazy">`;
            } else {
                proofHTML = `<a href="${escapeHTML(tip.proofOfVisit)}" target="_blank" rel="noopener noreferrer" class="tip-proof-link">🔗 View Proof of Visit</a>`;
            }
        }

        // Format location gracefully (Spot, City, Country)
        const locationParts = [];
        if (tip.location) locationParts.push(tip.location);
        if (tip.city) locationParts.push(tip.city);
        if (tip.country) locationParts.push(tip.country);
        const fullLocation = locationParts.join(', ');

        const cardHTML = `
        <article class="tip-card">
            <div class="tip-header">
                <span class="tip-location">📍 ${escapeHTML(fullLocation)}</span>
                <span class="tip-category">${escapeHTML(tip.category)}</span>
            </div>
            <div class="tip-content">${escapeHTML(tip.content)}</div>
            ${proofHTML}
            <div class="tip-footer">
                <span class="tip-author">
                    👤 ${escapeHTML(tip.authorName)}
                    ${tip.authorEmail ? `<a href="mailto:${escapeHTML(tip.authorEmail)}" style="color: var(--primary-blue); text-decoration: none; margin-left: 5px;" title="Email Author">✉️</a>` : ''}
                </span>
                <span class="tip-date">🕒 ${timeString}</span>
            </div>
        </article>
    `;

        // Append to container
        tipsContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

// Helper function to prevent XSS (Cross-Site Scripting)
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

// --- 5. EVENT LISTENERS ---

// When form is submitted
tipForm.addEventListener('submit', saveTip);

// When filter inputs change
filterCategory.addEventListener('change', renderTips);
filterCountry.addEventListener('change', renderTips);
filterCity.addEventListener('input', renderTips);
filterLocation.addEventListener('input', renderTips);

// Explicit Filter Buttons
applyFiltersBtn.addEventListener('click', renderTips);
clearFiltersBtn.addEventListener('click', () => {
    filterCategory.value = 'All';
    filterCountry.value = 'All';
    filterCity.value = '';
    filterLocation.value = '';
    renderTips();
});

// Initial fetch when page loads
console.log("Initializing: Page loaded, fetching tips...");
fetchTips();

console.log("Ready: Event listeners attached and form identified:", !!tipForm);
