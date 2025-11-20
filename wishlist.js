/* === GLOBÁLNÍ PROMĚNNÉ PRO WISHLIST === */
let allPeaks = []; // Sem se načtou všechna data z GeoJSON
const searchInput = document.getElementById('peak-search-input');
const resultsContainer = document.getElementById('search-results');
const listContainer = document.getElementById('wishlist-container');
const themeToggle = document.getElementById('theme-toggle-checkbox');

/* === LOGIKA TÉMATU === */
if (themeToggle) {
    themeToggle.addEventListener('change', (e) => {
        setTheme(e.target.checked ? 'dark' : 'light'); 
    });
}
const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
setTheme(savedTheme); 
/* === KONEC LOGIKY TÉMATU === */


/* === FUNKCE PRO OVLÁDÁNÍ WISHLISTU === */

function renderWishlist() {
    const wishlistIDs = getWishlist(); 
    listContainer.innerHTML = ''; 

    if (wishlistIDs.length === 0) {
        listContainer.innerHTML = '<li>Your wishlist is empty. Add peaks using the search bar.</li>';
    } else {
        for (const peakId of wishlistIDs) {
            // Najdeme vrchol v načtených datech
            const feature = allPeaks.find(f => f.properties.OBJECTID == peakId);
            
            if (feature) {
                const props = feature.properties;
                
                // Zjistíme, jestli je už zdolán (pro vizuální indikaci v seznamu)
                const peakData = getPeakData();
                const isClimbed = peakData.hasOwnProperty(peakId);
                const statusIcon = isClimbed ? '✅' : '⬜';

                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="wishlist-item-info">
                        <strong>${statusIcon} ${props.name}</strong>
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
    
    // DŮLEŽITÉ: Aktualizujeme počítadlo v patičce
    // Nyní to bude fungovat správně, protože updateCounter v ui.js bere data z getWishlist()
    updateCounter(); 
}

function addToWishlist(peakId) {
    let ids = getWishlist();
    if (!ids.includes(peakId)) {
        ids.push(peakId);
        saveWishlist(ids);
        renderWishlist();
    }
    searchInput.value = '';
    resultsContainer.style.display = 'none';
}

function removeFromWishlist(peakId) {
    let ids = getWishlist();
    ids = ids.filter(id => id !== peakId);
    saveWishlist(ids);
    renderWishlist();
}

/* === FUNKCE PRO VYHLEDÁVÁNÍ === */
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    resultsContainer.innerHTML = '';

    if (query.length < 3) {
        resultsContainer.style.display = 'none';
        return;
    }

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
        li.onclick = () => addToWishlist(props.OBJECTID);
        resultsContainer.appendChild(li);
    }
});

document.addEventListener('click', (e) => {
    if (e.target !== searchInput) {
        resultsContainer.style.display = 'none';
    }
});


/* === INICIALIZACE STRÁNKY === */
fetch('data/VrcholyAll.geojson')
    .then(res => res.json())
    .then(data => {
        allPeaks = data.features;
        // Globální proměnná pro ui.js (pokud by byla potřeba, ale ui.js už používá wishlist)
        totalPeakCount = data.features.length; 
        
        renderWishlist(); 
    })
    .catch(err => {
        console.error("Error loading peak data:", err);
        listContainer.innerHTML = '<li>Error loading peak data. Please try again later.</li>';
    });