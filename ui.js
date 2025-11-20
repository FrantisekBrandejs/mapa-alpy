/* === FUNKCE PRO AKTUALIZACI UI === */

/**
 * Počítá postup POUZE vůči vrcholům ve WISHLISTU
 */
function updateCounter() {
    const peakData = getPeakData(); // Zdoláno (data z localStorage)
    const wishlistIDs = getWishlist(); // Wishlist (pole IDček)

    // 1. Celkový počet je dán velikostí Wishlistu (nikoliv všemi vrcholy v GeoJSONu)
    const totalCount = wishlistIDs.length;
    let zdolanocount = 0;

    // 2. Spočítáme, kolik vrcholů z Wishlistu je zároveň zdoláno
    if (totalCount > 0) {
        for (const peakId of wishlistIDs) {
            // Pozor: peakId může být číslo, klíče v peakData jsou stringy
            if (peakData.hasOwnProperty(peakId)) {
                zdolanocount++;
            }
        }
    }

    // 3. Aktualizace textu
    const numbersEl = document.getElementById('counter-numbers');
    if (numbersEl) {
        if (totalCount === 0) {
            numbersEl.innerText = "Wishlist is empty";
        } else {
            numbersEl.innerText = `${zdolanocount} / ${totalCount}`;
        }
    }

    // 4. Aktualizace pruhu
    const fillEl = document.getElementById('progress-bar-fill');
    if (fillEl) {
        const percentage = (totalCount === 0) ? 0 : (zdolanocount / totalCount) * 100;
        fillEl.style.width = `${percentage}%`;
        
        // Nastavení barvy (zlatá/tyrkysová dle konstanty)
        if (typeof COLOR_ZDOLANO !== 'undefined') {
             fillEl.style.backgroundColor = COLOR_ZDOLANO;
        }
    }

    // 5. Aktualizace checkpointů (rysek na pruhu)
    createCheckpoints(totalCount);
}

/**
 * Vytvoří rysky na progress baru po 5 vrcholech
 */
function createCheckpoints(totalCount) {
    const container = document.getElementById('progress-bar-markers');
    
    if (!container) return;
    container.innerHTML = ''; // Vyčistit staré

    if (totalCount === 0 || !totalCount) return;

    // Rysky po 5 vrcholech
    for (let i = 5; i < totalCount; i += 5) {
        const percentage = (i / totalCount) * 100;
        const marker = document.createElement('div');
        marker.className = 'checkpoint-marker';
        marker.style.left = `${percentage}%`;
        container.appendChild(marker);
    }
}

/* --- Pomocné funkce pro UI --- */

function editPeak(peakId) {
    if (!peakId) return;
    // Funkce pro přesměrování na mapu a otevření popupu
    // Pokud jsme na mapě, peakLayerMap existuje
    if (typeof peakLayerMap !== 'undefined') {
        const layer = peakLayerMap.get(peakId);
        if (layer) {
            layer.openPopup();
        }
    } else {
        // Pokud jsme na wishlistu, musíme uživatele poslat na mapu
        // (Toto je pokročilejší, zatím necháme prázdné nebo alert)
        window.location.href = "index.html";
    }
}

// Funkce pro aktualizaci seznamu v levém panelu (na stránce mapy)
function updatePeakList() {
    // Tato funkce běží jen na stránce s mapou, kde je element 'peak-list'
    const listEl = document.getElementById('peak-list');
    if (!listEl) return;

    const peakData = getPeakData();
    // allPeaksData je globální proměnná v mapa.js
    if (typeof allPeaksData === 'undefined' || allPeaksData.length === 0) return;
    
    listEl.innerHTML = ''; 

    let climbedPeaksInfo = [];
    for (const peakId in peakData) {
        // Najdeme data o vrcholu
        const feature = allPeaksData.find(f => f.properties.OBJECTID == peakId);
        if (feature) {
            climbedPeaksInfo.push({
                id: feature.properties.OBJECTID,
                name: feature.properties.name,
                ele: feature.properties.ele,
                stat: feature.properties.stat,
                datum: peakData[peakId].datum,
                elevace: peakData[peakId].elevace
            });
        }
    }

    // Seřadíme podle data (nejnovější nahoře)
    climbedPeaksInfo.sort((a, b) => {
        if (a.datum && b.datum) return b.datum.localeCompare(a.datum);
        if (a.datum && !b.datum) return -1;
        if (!a.datum && b.datum) return 1;
        return 0;
    });

    if (climbedPeaksInfo.length === 0) {
        listEl.innerHTML = '<li>No peaks have been climbed yet.</li>';
    } else {
        for (const peak of climbedPeaksInfo) {
            const dateStr = formatDate(peak.datum);
            const countryName = getCountryName(peak.stat);
            const altitudeStr = peak.ele ? `${peak.ele} m a.s.l.` : '---';
            let elevStr = '---';
            if (peak.elevace) {
                elevStr = `${peak.elevace} m ⬆️`;
            }

            const li = document.createElement('li');
            li.innerHTML = `
                <strong class="peak-list-name">${peak.name}</strong>
                <small class="peak-list-details">${altitudeStr}</small>
                <small class="peak-list-elevation">${elevStr}</small>
                <span class="peak-list-country">${countryName}</span>
                <small class="peak-list-date">${dateStr}</small>
                <button class="edit-peak-emoji-btn" 
                        title="Show on map" 
                        onclick="editPeak(${peak.id})">
                    📍
                </button>
            `;
            listEl.appendChild(li);
        }
    }
}

// Funkce pro inicializaci grafu (běží jen na stránce s mapou)
function initializeDashboard() {
    const ctxElement = document.getElementById('elevation-chart');
    if (!ctxElement) return;

    const ctx = ctxElement.getContext('2d');
    
    // Globální proměnná elevationChart z mapa.js
    if (typeof Chart !== 'undefined') {
        elevationChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Elevation Gain',
                    data: [],
                    backgroundColor: [],
                    borderColor: [],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { 
                    y: { beginAtZero: true, ticks: { color: '#666' } },
                    x: { ticks: { color: '#666' } }
                }
            }
        });
    }

    // Listenery
    const filterCountry = document.getElementById('filter-country');
    if (filterCountry) {
        filterCountry.addEventListener('change', updateDashboard);
        document.getElementById('filter-date-from').addEventListener('change', updateDashboard);
        document.getElementById('filter-date-to').addEventListener('change', updateDashboard);
    }
}

// Funkce pro aktualizaci grafu a statistik
function updateDashboard() {
    if (typeof elevationChart === 'undefined' || !elevationChart) return;
    if (typeof allPeaksData === 'undefined' || allPeaksData.length === 0) return;
    
    const peakData = getPeakData();
    const filterCountry = document.getElementById('filter-country').value;
    const filterDateFrom = document.getElementById('filter-date-from').value;
    const filterDateTo = document.getElementById('filter-date-to').value;
    
    let stats = { 'AUT': 0, 'ITA': 0, 'CHE': 0, 'FRA': 0, 'DEU': 0, 'SVN': 0 };
    let totalElevationSum = 0;
    let count4000 = 0, count3500 = 0, count3000 = 0, count2500 = 0;

    for (const peakId in peakData) {
        const feature = allPeaksData.find(f => f.properties.OBJECTID == peakId);
        if (!feature) continue;
        
        const props = feature.properties;
        const climbData = peakData[peakId];
        
        if (filterCountry !== 'ALL' && props.stat !== filterCountry) continue;
        if (filterDateFrom && climbData.datum && climbData.datum < filterDateFrom) continue;
        if (filterDateTo && climbData.datum && climbData.datum > filterDateTo) continue;
        
        const ele = props.ele;
        if (ele) {
            if (ele >= 4000) count4000++;
            else if (ele >= 3500) count3500++;
            else if (ele >= 3000) count3000++;
            else if (ele >= 2500) count2500++;
        }
        
        const elevace = parseInt(climbData.elevace, 10) || 0;
        if (elevace > 0 && stats.hasOwnProperty(props.stat)) {
            stats[props.stat] += elevace;
        }
        totalElevationSum += elevace;
    }

    // Update HTML
    const elTotal = document.getElementById('total-elevation-sum');
    if (elTotal) elTotal.innerText = `${totalElevationSum.toLocaleString('en-US')} m ⬆️`;
    
    if(document.getElementById('stat-count-4000')) document.getElementById('stat-count-4000').innerText = count4000;
    if(document.getElementById('stat-count-3500')) document.getElementById('stat-count-3500').innerText = count3500;
    if(document.getElementById('stat-count-3000')) document.getElementById('stat-count-3000').innerText = count3000;
    if(document.getElementById('stat-count-2500')) document.getElementById('stat-count-2500').innerText = count2500;
    
    // Update Chart
    let labels = [], data = [], colors = [];
    for (const stat in stats) {
        if (stats[stat] > 0) {
            labels.push(getCountryName(stat));
            data.push(stats[stat]);
            colors.push(getPeakColor(stat));
        }
    }
    elevationChart.data.labels = labels;
    elevationChart.data.datasets[0].data = data;
    elevationChart.data.datasets[0].backgroundColor = colors;
    elevationChart.update();
}

function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    const toggle = document.getElementById('theme-toggle-checkbox');
    
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        if (toggle) toggle.checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        if (toggle) toggle.checked = false;
    }
    
    if (typeof elevationChart !== 'undefined' && elevationChart) {
        const newColor = (theme === 'dark') ? '#eee' : '#666';
        if(elevationChart.options.scales.y) elevationChart.options.scales.y.ticks.color = newColor;
        if(elevationChart.options.scales.x) elevationChart.options.scales.x.ticks.color = newColor;
        elevationChart.update();
    }
}