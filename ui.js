/* === UI FUNCTIONS === */

function editPeak(peakId) {
    if (!peakId) return;
    if (window.peakLayerMap && window.peakLayerMap.size > 0) {
        const layer = window.peakLayerMap.get(peakId);
        if (layer) {
            layer.openPopup();
        }
    }
}

function updatePeakList() {
    const peakData = getPeakData();
    const listEl = document.getElementById('peak-list');
    
    if (!listEl || !window.allPeaksData || window.allPeaksData.length === 0) return;
    
    listEl.innerHTML = ''; 
    let climbedPeaksInfo = [];
    
    for (const peakId in peakData) {
        const feature = window.allPeaksData.find(f => f.properties.OBJECTID == peakId);
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
        return 0;
    });

    if (climbedPeaksInfo.length === 0) {
        listEl.innerHTML = '<li style="padding:10px; color:#666;">No peaks have been climbed yet.</li>';
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
                <strong class="peak-list-name">${getFlagEmoji(peak.stat)} ${peak.name}</strong>
                <small class="peak-list-details">${altitudeStr}</small>
                <small class="peak-list-elevation">${elevStr}</small>
                <span class="peak-list-country">${countryName}</span>
                <small class="peak-list-date">${dateStr}</small>
                <button class="edit-peak-emoji-btn" title="Show on map" onclick="editPeak(${peak.id})">📍</button>
            `;
            listEl.appendChild(li);
        }
    }
}

function initializeDashboard() {
    const ctxElement = document.getElementById('elevation-chart');
    if (!ctxElement) return;

    const ctx = ctxElement.getContext('2d');
    if (typeof Chart !== 'undefined') {
        window.elevationChart = new Chart(ctx, {
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

    const filterCountry = document.getElementById('filter-country');
    if (filterCountry) {
        filterCountry.addEventListener('change', updateDashboard);
        document.getElementById('filter-date-from').addEventListener('change', updateDashboard);
        document.getElementById('filter-date-to').addEventListener('change', updateDashboard);
    }
}

function updateDashboard() {
    if (typeof window.elevationChart === 'undefined' || !window.elevationChart) return;
    if (typeof window.allPeaksData === 'undefined' || window.allPeaksData.length === 0) return;
    
    const peakData = getPeakData();
    const filterCountry = document.getElementById('filter-country').value;
    const filterDateFrom = document.getElementById('filter-date-from').value;
    const filterDateTo = document.getElementById('filter-date-to').value;
    
    let stats = { 'AUT': 0, 'ITA': 0, 'CHE': 0, 'FRA': 0, 'DEU': 0, 'SVN': 0 };
    let totalElevationSum = 0;
    let count4000 = 0, count3500 = 0, count3000 = 0, count2500 = 0, countTotal = 0;

    for (const peakId in peakData) {
        const feature = window.allPeaksData.find(f => f.properties.OBJECTID == peakId);
        if (!feature) continue;
        
        const props = feature.properties;
        const climbData = peakData[peakId];
        
        if (filterCountry !== 'ALL' && props.stat !== filterCountry) continue;
        if (filterDateFrom && climbData.datum && climbData.datum < filterDateFrom) continue;
        if (filterDateTo && climbData.datum && climbData.datum > filterDateTo) continue;
        
        countTotal++; // Zapocitavame celkem

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

    document.getElementById('total-elevation-sum').innerText = `${totalElevationSum.toLocaleString('en-US')} m ⬆️`;
    
    document.getElementById('stat-count-4000').innerText = count4000;
    document.getElementById('stat-count-3500').innerText = count3500;
    document.getElementById('stat-count-3000').innerText = count3000;
    document.getElementById('stat-count-2500').innerText = count2500;
    // Nový součet
    if(document.getElementById('stat-count-total')) document.getElementById('stat-count-total').innerText = countTotal;
    
    let labels = [], data = [], colors = [];
    for (const stat in stats) {
        if (stats[stat] > 0) {
            labels.push(getCountryName(stat));
            data.push(stats[stat]);
            colors.push(getPeakColor(stat));
        }
    }
    
    window.elevationChart.data.labels = labels;
    window.elevationChart.data.datasets[0].data = data;
    window.elevationChart.data.datasets[0].backgroundColor = colors;
    window.elevationChart.update();
}