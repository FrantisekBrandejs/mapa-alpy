/* === FUNKCE PRO AKTUALIZACI UI === */

function updateCounter() {
    const peakData = getPeakData();
    const zdolanocount = Object.keys(peakData).length;
    const totalCount = totalPeakCount; // Závisí na globální proměnné z mapa.js
    if (totalCount === 0) {
        document.getElementById('counter-numbers').innerText = `0 / 0`;
        return;
    }
    const percentage = (zdolanocount / totalCount) * 100;
    const numbersEl = document.getElementById('counter-numbers');
    const fillEl = document.getElementById('progress-bar-fill');
    if (numbersEl) {
        numbersEl.innerText = `${zdolanocount} / ${totalCount}`;
    }
    if (fillEl) {
        fillEl.style.width = `${percentage}%`;
    }
}

function createCheckpoints() {
    const container = document.getElementById('progress-bar-markers');
    if (!container || totalPeakCount === 0) return;
    container.innerHTML = '';
    for (let i = 100; i < totalPeakCount; i += 100) {
        const percentage = (i / totalPeakCount) * 100;
        const marker = document.createElement('div');
        marker.className = 'checkpoint-marker';
        marker.style.left = `${percentage}%`;
        container.appendChild(marker);
    }
}

function editPeak(peakId) {
    if (!peakId) return;
    const layer = peakLayerMap.get(peakId); // Závisí na globální proměnné z mapa.js
    if (layer) {
        layer.openPopup();
    }
}

function updatePeakList() {
    const peakData = getPeakData();
    const listEl = document.getElementById('peak-list');
    if (!listEl || allPeaksData.length === 0) return; // Závisí na globální proměnné z mapa.js
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
    const ctx = document.getElementById('elevation-chart').getContext('2d');
    elevationChart = new Chart(ctx, { // Závisí na globální proměnné z mapa.js
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

    document.getElementById('filter-country').addEventListener('change', updateDashboard);
    document.getElementById('filter-date-from').addEventListener('change', updateDashboard);
    document.getElementById('filter-date-to').addEventListener('change', updateDashboard);
}

function updateDashboard() {
    const peakData = getPeakData();
    if (allPeaksData.length === 0) return; // Závisí na globální proměnné z mapa.js

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
    
    if (elevationChart) { // Závisí na globální proměnné z mapa.js
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
}

/* === FUNKCE PRO NASTAVENÍ TÉMATU === */
function setTheme(theme) {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle-checkbox').checked = true;
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('theme-toggle-checkbox').checked = false;
    }
    
    if (elevationChart) { // Závisí na globální proměnné z mapa.js
        const newColor = (theme === 'dark') ? '#eee' : '#666';
        elevationChart.options.scales.y.ticks.color = newColor;
        elevationChart.options.scales.x.ticks.color = newColor;
        elevationChart.update();
    }
}