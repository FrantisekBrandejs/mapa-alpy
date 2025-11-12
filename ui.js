/* === FUNKCE PRO AKTUALIZACI UI === */

/**
 * NOVÁ VERZE: Počítá postup vůči *wishlistu*
 */
function updateCounter() {
    const peakData = getPeakData(); // Zdoláno: { "123": {data...}, "456": {data...} }
    const wishlistIDs = getWishlist(); // Wishlist: [123, 789]

    const totalCount = wishlistIDs.length; // Maximum je počet vrcholů ve wishlistu
    let zdolanocount = 0;

    // Spočítáme průnik (kolik z wishlistu je ve zdoláno)
    if (totalCount > 0) {
        for (const peakId of wishlistIDs) {
            if (peakData.hasOwnProperty(peakId)) {
                zdolanocount++;
            }
        }
    }

    // Aktualizace textu
    const numbersEl = document.getElementById('counter-numbers');
    if (numbersEl) {
        if (totalCount === 0) {
            // Pokud je wishlist prázdný, ukážeme celkový počet zdolaných vůči VŠEM vrcholům
            const totalClimbed = Object.keys(peakData).length;
            if (totalPeakCount > 0) { // totalPeakCount je globální proměnná
                numbersEl.innerText = `${totalClimbed} / ${totalPeakCount}`;
            } else {
                numbersEl.innerText = `Loading...`;
            }
        } else {
            // Pokud wishlist NENÍ prázdný, ukážeme postup wishlistu
            numbersEl.innerText = `${zdolanocount} / ${totalCount}`;
        }
    }

    // Aktualizace pruhu
    const fillEl = document.getElementById('progress-bar-fill');
    if (fillEl) {
        const percentage = (totalCount === 0) ? 0 : (zdolanocount / totalCount) * 100;
        fillEl.style.width = `${percentage}%`;
    }

    // Musíme také aktualizovat checkpointy, protože totalCount se mohl změnit
    createCheckpoints();
}

/**
 * NOVÁ VERZE: Checkpointy po 5 vrcholech (vůči wishlistu)
 */
function createCheckpoints() {
    const container = document.getElementById('progress-bar-markers');
    const totalCount = getWishlist().length; // Max je počet ve wishlistu

    if (!container) return;
    container.innerHTML = ''; // Vyčistíme staré

    if (totalCount === 0) return; // Pokud je wishlist prázdný, nic nekreslíme

    // Projdeme po 5 až k celkovému počtu
    for (let i = 1; i < totalCount; i += 1) {
        // Vypočítáme pozici značky v procentech
        const percentage = (i / totalCount) * 100;

        const marker = document.createElement('div');
        marker.className = 'checkpoint-marker';
        marker.style.left = `${percentage}%`;
        
        container.appendChild(marker);
    }
}

function editPeak(peakId) {
    if (!peakId) return;
    const layer = peakLayerMap.get(peakId);
    if (layer) {
        layer.openPopup();
    }
}

function updatePeakList() {
    const peakData = getPeakData();
    const listEl = document.getElementById('peak-list');
    if (!listEl || allPeaksData.length === 0) return;
    listEl.innerHTML = ''; 

    let climbedPeaksInfo = [];
    for (const peakId in peakData) {
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
                        title="Edit entry" 
                        onclick="editPeak(${peak.id})">
                    ✏️
                </button>
            `;
            listEl.appendChild(li);
        }
    }
}

function initializeDashboard() {
    // Kontrola, zda graf existuje (pouze na index.html)
    const ctx = document.getElementById('elevation-chart');
    if (!ctx) return; 

    elevationChart = new Chart(ctx.getContext('2d'), {
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
                y: { 
                    beginAtZero: true,
                    ticks: { color: getComputedStyle(document.body).getPropertyValue('color') }
                },
                x: {
                    ticks: { color: getComputedStyle(document.body).getPropertyValue('color') }
                }
            }
        }
    });

    // Kontrola, zda filtry existují
    const filterCountry = document.getElementById('filter-country');
    if (filterCountry) {
        filterCountry.addEventListener('change', updateDashboard);
        document.getElementById('filter-date-from').addEventListener('change', updateDashboard);
        document.getElementById('filter-date-to').addEventListener('change', updateDashboard);
    }
}

function updateDashboard() {
    if (!elevationChart) return; // Nekreslíme graf, pokud jsme na wishlist.html

    const peakData = getPeakData();
    if (allPeaksData.length === 0) return;

    const filterCountry = document.getElementById('filter-country').value;
    const filterDateFrom = document.getElementById('filter-date-from').value;
    const filterDateTo = document.getElementById('filter-date-to').value;
    
    let stats = {
        'AUT': 0, 'ITA': 0, 'CHE': 0, 'FRA': 0, 'DEU': 0, 'SVN': 0
    };
    let totalElevationSum = 0;
    
    let count4000 = 0, count3750 = 0, count3500 = 0, count3250 = 0, count3000 = 0;

    for (const peakId in peakData) {
        const feature = allPeaksData.find(f => f.properties.OBJECTID == peakId);
        if (!feature) continue;
        
        const props = feature.properties;
        const climbData = peakData[peakId];
        
        if (filterCountry !== 'ALL' && props.stat !== filterCountry) continue;
        if (filterDateFrom && climbData.datum && climbData.datum < filterDateFrom) continue;
        if (filterDateTo && climbData.datum && climbData.datum > filterDateTo) continue;
        
        const ele = props.ele;
        if (ele && ele >= 4000) { count4000++; }
        else if (ele && ele >= 3750) { count3750++; }
        else if (ele && ele >= 3500) { count3500++; }
        else if (ele && ele >= 3250) { count3250++; }
        else if (ele && ele >= 3000) { count3000++; }
        
        const elevace = parseInt(climbData.elevace, 10) || 0;
        if (elevace > 0) {
            if (stats.hasOwnProperty(props.stat)) {
                stats[props.stat] += elevace;
            }
        }
        totalElevationSum += elevace;
    }

    document.getElementById('total-elevation-sum').innerText = `${totalElevationSum.toLocaleString('en-US')} m ⬆️`;
    document.getElementById('stat-count-4000').innerText = count4000;
    document.getElementById('stat-count-3750').innerText = count3750;
    document.getElementById('stat-count-3500').innerText = count3500;
    document.getElementById('stat-count-3250').innerText = count3250;
    document.getElementById('stat-count-3000').innerText = count3000;
    
    let labels = [], data = [], colors = [];
    for (const stat in stats) {
        if (stats[stat] > 0) {
            labels.push(stat);
            data.push(stats[stat]);
            colors.push(getPeakColor(stat));
        }
    }
    
    elevationChart.data.labels = labels;
    elevationChart.data.datasets[0].data = data;
    elevationChart.data.datasets[0].backgroundColor = colors;
    elevationChart.update();
}

/* === FUNKCE PRO NASTAVENÍ TÉMATU === */
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
    
    if (elevationChart) {
        const newColor = (theme === 'dark') ? '#eee' : '#666';
        elevationChart.options.scales.y.ticks.color = newColor;
        elevationChart.options.scales.x.ticks.color = newColor;
        elevationChart.update();
    }
}