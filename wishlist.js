/* === GLOBÁLNÍ PROMĚNNÉ PRO WISHLIST === */
let allPeaks = []; // Sem se načtou všechna data z GeoJSON
const searchInput = document.getElementById('peak-search-input');
const resultsContainer = document.getElementById('search-results');
const listContainer = document.getElementById('wishlist-container');
const themeToggle = document.getElementById('theme-toggle-checkbox');

// Tyto proměnné musíme definovat jako 'null' nebo 0, 
// protože soubor ui.js je očekává, i když je zde nepoužíváme.
let elevationChart = null; 
let totalPeakCount = 0; // Pro funkci updateCounter()

/* === LOGIKA TÉMATU === */
if (themeToggle) {
    themeToggle.addEventListener('change', (e) => {
        setTheme(e.target.checked ? 'dark' : 'light'); // Volá funkci z ui.js
    });
}
// Načtení uloženého tématu při startu
const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
setTheme(savedTheme); // Volá funkci z ui.js
/* === KONEC LOGIKY TÉMATU === */


/* === FUNKCE PRO OVLÁDÁNÍ WISHLISTU === */

/**
 * Vykreslí seznam přání (wishlist)
 */
function renderWishlist() {
    const wishlistIDs = getWishlist(); // Volá funkci ze storage.js
    listContainer.innerHTML = ''; // Vyčistíme starý seznam

    if (wishlistIDs.length === 0) {
        listContainer.innerHTML = '<li>Your wishlist is empty. Add peaks using the search bar.</li>';
        return;
    }

    // Projdeme IDčka, najdeme data a vykreslíme je
    for (const peakId of wishlistIDs) {
        // Hledáme v 'allPeaks', které se načte při startu
        const feature = allPeaks.find(f => f.properties.OBJECTID == peakId);
        
        if (feature) {
            const props = feature.properties;
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="wishlist-item-info">
                    <strong>${props.name}</strong>
                    <small>${getCountryName(props.stat)} | ${props.ele} m a.s.l.</small>
                </div>
                <button class="wishlist-remove-btn" onclick="removeFromWishlist(${peakId})">
                    Remove
                </button>
            `;
            listContainer.appendChild(li);
        }
    }
}

/**
 * Přidá vrchol do seznamu přání
 */
function addToWishlist(peakId) {
    let ids = getWishlist(); // Volá storage.js
    if (!ids.includes(peakId)) {
        ids.push(peakId);
        saveWishlist(ids); // Volá storage.js
        renderWishlist();
    }
    // Vyčistíme hledání
    searchInput.value = '';
    resultsContainer.style.display = 'none';
}

/**
 * Odebere vrchol ze seznamu přání
 */
function removeFromWishlist(peakId) {
    let ids = getWishlist();
    ids = ids.filter(id => id !== peakId);
    saveWishlist(ids);
    renderWishlist();
}

/* === FUNKCE PRO VYHLEDÁVÁNÍ === */

// Listener pro psaní do vyhledávacího pole
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    resultsContainer.innerHTML = '';

    if (query.length < 3) {
        resultsContainer.style.display = 'none';
        return;
    }

    // Najdeme max 10 shod
    const results = allPeaks.filter(f => 
        f.properties.name && f.properties.name.toLowerCase().includes(query)
    ).slice(0, 10);

    if (results.length > 0) {
        resultsContainer.style.display = 'block';
    } else {
        resultsContainer.style.display = 'none';
    }

    for (const feature of results) {
        const props = feature.properties;
        const li = document.createElement('li');
        li.innerHTML = `
            <span class="search-result-name">${props.name}</span>
            <span class="search-result-details">${getCountryName(props.stat)} | ${props.ele} m</span>
        `;
        // Při kliknutí na výsledek se vrchol přidá do seznamu
        li.onclick = () => addToWishlist(props.OBJECTID);
        resultsContainer.appendChild(li);
    }
});

// Skryjeme výsledky, když uživatel klikne kamkoli jinam
document.addEventListener('click', (e) => {
    if (e.target !== searchInput) {
        resultsContainer.style.display = 'none';
    }
});


/* === INICIALIZACE STRÁNKY === */

// 1. Načteme VŠECHNA data o vrcholech
// Používáme stejný datový soubor jako mapa
fetch('data/VrcholyAll.geojson')
    .then(res => res.json())
    .then(data => {
        allPeaks = data.features;
        totalPeakCount = data.features.length; // Potřebné pro ui.js
        
        // 2. Vykreslíme seznam vrcholů, které už jsou uložené
        renderWishlist();
        
        // 3. Aktualizujeme patičku (counter)
        updateCounter(); // Volá funkci z ui.js
        createCheckpoints(); // Volá funkci z ui.js
    })
    .catch(err => {
        console.error("Error loading peak data:", err);
        listContainer.innerHTML = '<li>Error loading peak data. Please try again later.</li>';
    });