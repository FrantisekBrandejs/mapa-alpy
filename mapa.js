/* === SYSTÉM PRO UKLÁDÁNÍ ZDOLANÝCH VRCHOLŮ === */
const STORAGE_KEY_DATA = 'zdolaneVrcholyData';
const STORAGE_KEY_THEME = 'appTheme';
const COLOR_ZDOLANO = "#ffd700";
let peakLayerMap = new Map();
let totalPeakCount = 0;
let allPeaksData = [];
let elevationChart = null;
let vrcholyGeoJSONLayer = null;

/* === FUNKCE PRO UKLÁDÁNÍ (LocalStorage) === */
function getPeakData() {
    const data = localStorage.getItem(STORAGE_KEY_DATA);
    return data ? JSON.parse(data) : {};
}
function savePeakData(data) {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
}

/* === FUNKCE PRO AKTUALIZACI UI === */
function updateCounter() {
    const peakData = getPeakData();
    const zdolanocount = Object.keys(peakData).length;
    const totalCount = totalPeakCount;
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

function savePeakClimb(peakId, defaultColor) {
    if (!peakId) return;
    const checkbox = document.getElementById(`peak-${peakId}`);
    const dateInput = document.getElementById(`date-${peakId}`);
    const elevInput = document.getElementById(`elev-${peakId}`);
    const isChecked = checkbox.checked;
    const dateValue = dateInput.value;
    const elevValue = elevInput.value;

    let allData = getPeakData();
    const layer = peakLayerMap.get(peakId);
    const props = layer.feature.properties; 

    layer.unbindTooltip();

    if (isChecked) {
        allData[peakId] = { 
            datum: dateValue || null,
            elevace: elevValue || null
        };
        if (layer) {
            layer.setStyle({ fillColor: COLOR_ZDOLANO });
            layer.bindTooltip(`<span class="climbed-label">${props.name} ✅</span>`, {
                permanent: true,
                className: 'climbed-tooltip',
                direction: 'top',
                offset: [0, -10]
            });
        }
    } else {
        delete allData[peakId];
        if (layer) {
            layer.setStyle({ fillColor: defaultColor });
        }
    }
    
    savePeakData(allData);
    updateCounter();
    updatePeakList();
    updateDashboard();
    map.closePopup();
}

function initializeDashboard() {
    const ctx = document.getElementById('elevation-chart').getContext('2d');
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
    
    if (elevationChart) {
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
/* === KONEC FUNKCÍ PRO UI === */


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
    
    if (elevationChart) {
        const newColor = (theme === 'dark') ? '#eee' : '#666';
        elevationChart.options.scales.y.ticks.color = newColor;
        elevationChart.options.scales.x.ticks.color = newColor;
        elevationChart.update();
    }
}
/* === KONEC FUNKCE TÉMATU === */

/*
 * ===============================================
 * OVLÁDACÍ PRVEK PRO FILTR VÝŠKY (OPRAVENÝ - STATICKÝ)
 * ===============================================
 */

/**
 * Filtruje vrcholy na mapě podle hodnot v input polích
 */
function filterPeaks() {
    const minAltInput = document.getElementById('min-alt').value;
    const maxAltInput = document.getElementById('max-alt').value;
    
    // Pokud je pole prázdné, použije 0 nebo 9999
    const minFilter = minAltInput ? parseInt(minAltInput, 10) : 0;
    const maxFilter = maxAltInput ? parseInt(maxAltInput, 10) : 9999;

    if (!vrcholyGeoJSONLayer) return;

    vrcholyGeoJSONLayer.eachLayer((layer) => {
        const ele = layer.feature.properties.ele;

        if (ele >= minFilter && ele <= maxFilter) {
            layer.setStyle({ opacity: 1, fillOpacity: 0.8 });
            if (layer.getTooltip() && layer.getTooltip()._container) {
                layer.getTooltip()._container.style.display = 'block';
            }
        } else {
            layer.setStyle({ opacity: 0, fillOpacity: 0 });
            if (layer.getTooltip() && layer.getTooltip()._container) {
                layer.getTooltip()._container.style.display = 'none';
            }
        }
    });
}

/**
 * Vytvoříme nový ovládací prvek Leaflet
 */
const altitudeFilterControl = L.control({ position: 'topleft' });

altitudeFilterControl.onAdd = function (map) {
    // 1. Vytvoříme hlavní 'div' kontejner
    //    Dáme mu rovnou i novou třídu pro zmenšení
    const container = L.DomUtil.create('div', 'leaflet-control-altitude-filter leaflet-bar');
    L.DomEvent.disableClickPropagation(container);

    // 2. Vytvoříme obsah formuláře
    const label = L.DomUtil.create('label', 'altitude-filter-label', container);
    label.innerText = 'Altitude Filter:';

    const inputsDiv = L.DomUtil.create('div', 'altitude-filter-inputs', container);
    const minInput = L.DomUtil.create('input', '', inputsDiv);
    minInput.type = 'number';
    minInput.id = 'min-alt';
    minInput.placeholder = 'Min';

    const maxInput = L.DomUtil.create('input', '', inputsDiv);
    maxInput.type = 'number';
    maxInput.id = 'max-alt';
    maxInput.placeholder = 'Max';
    
    // Kontejner pro tlačítka
    const buttonsDiv = L.DomUtil.create('div', 'altitude-filter-buttons', container);
    
    // Tlačítko pro filtrování
    const filterButton = L.DomUtil.create('button', 'altitude-filter-button', buttonsDiv);
    filterButton.innerText = 'Filter';
    filterButton.onclick = filterPeaks;
    
    // TLAČÍTKO PRO RESET
    const resetButton = L.DomUtil.create('button', 'altitude-filter-reset-button', buttonsDiv);
    resetButton.innerText = 'Reset';
    resetButton.onclick = function() {
        minInput.value = '';
        maxInput.value = '';
        filterPeaks(); // Zavoláme filtr s prázdnými hodnotami
    };

    return container;
};
/* === KONEC NOVÉHO OVLÁDACÍHO PRVKU === */


/* === HLAVNÍ LOGIKA APLIKACE === */

// 1. Inicializace mapy
const map = L.map('mapa');

// 2. Definice podkladových map
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 7
});
const API_KEY = 'mH-sjNiciF2i0Kq9leYtcUYXXak3-quskLtbyfNYFUA';
const mapyCz = L.tileLayer(`https://api.mapy.com/v1/maptiles/outdoor/256/{z}/{x}/{y}?apikey=${API_KEY}`, {
    minZoom: 7,
    attribution: '<a href="https://api.mapy.com/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
});
const mapyCzWinter = L.tileLayer(`https://api.mapy.com/v1/maptiles/winter/256/{z}/{x}/{y}?apikey=${API_KEY}`, {
    minZoom: 7,
    attribution: '<a href="https://api.mapy.com/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
});
const mapyCzAerial = L.tileLayer(`https://api.mapy.com/v1/maptiles/aerial/256/{z}/{x}/{y}?apikey=${API_KEY}`, {
    minZoom: 7,
    attribution: '<a href="https://api.mapy.com/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
});
const Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    minZoom: 7
});
osm.addTo(map);

// 3. Příprava "krabiček" (Layer Groups)
const vrcholyGroup = L.layerGroup();
const perimeterGroup = L.layerGroup();
const autGroup = L.layerGroup();
const itaGroup = L.layerGroup();
const cheGroup = L.layerGroup();
const fraGroup = L.layerGroup();
const deuGroup = L.layerGroup();
const svnGroup = L.layerGroup();

// 4. Vytvoření ovládacího panelu
const baseMaps = {
    "OpenStreetMap": osm,
    "Mapy.cz": mapyCz,
    "Esri World Imagery": Esri_WorldImagery,
    "Mapy.cz Winter": mapyCzWinter,
    "Mapy.cz Aerial": mapyCzAerial
};
const overlayMaps = {
    "🏔️ Alpine Peaks": vrcholyGroup,
    "📍 Alpine Perimeter": perimeterGroup,
    "🇦🇹 Austria": autGroup,
    "🇮🇹 Italy": itaGroup,
    "🇨🇭 Switzerland": cheGroup,
    "🇫🇷 France": fraGroup,
    "🇩🇪 Germany": deuGroup,
    "🇸🇮 Slovenia": svnGroup
};
L.control.layers(baseMaps, overlayMaps).addTo(map);

// 5. Načtení všech vašich dat
function getPeakColor(stat) {
    switch (stat) {
        case 'AUT': return '#e66e6e';
        case 'ITA': return '#74e66e';
        case 'CHE': return '#e66ec8';
        case 'FRA': return '#6ea7e6';
        case 'DEU': return '#000000';
        case 'SVN': return '#e6c36e';
        default:    return '#808080';
    }
}
function getFlagEmoji(stat) {
    switch (stat) {
        case 'AUT': return '🇦🇹';
        case 'ITA': return '🇮🇹';
        case 'CHE': return '🇨🇭';
        case 'FRA': return '🇫🇷';
        case 'DEU': return '🇩🇪';
        case 'SVN': return '🇸🇮';
        default:    return '🏴‍☠️';
    }
}
function getCountryName(stat) {
    switch (stat) {
        case 'AUT': return 'Austria';
        case 'ITA': return 'Italy';
        case 'CHE': return 'Switzerland';
        case 'FRA': return 'France';
        case 'DEU': return 'Germany';
        case 'SVN': return 'Slovenia';
        default:    return 'Unknown';
    }
}
function formatDate(isoDate) {
    if (!isoDate || isoDate === "") { return '---'; }
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


// Načtení vrstvy vrcholů s popupy
fetch('data/VrcholyAll.geojson')
    .then(response => response.json())
    .then(data => {
        
        allPeaksData = data.features;
        totalPeakCount = data.features.length; 
        const peakData = getPeakData();

        let minEle = 9999;
        let maxEle = 0;
        allPeaksData.forEach(f => {
            const ele = f.properties.ele;
            if (ele) {
                if (ele < minEle) minEle = ele;
                if (ele > maxEle) maxEle = ele;
            }
        });
        minEle = Math.floor(minEle / 100) * 100;
        maxEle = Math.ceil(maxEle / 100) * 100;

        vrcholyGeoJSONLayer = L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                const peakId = feature.properties.OBJECTID;
                const isZdolano = peakData.hasOwnProperty(peakId);
                const defaultColor = getPeakColor(feature.properties.stat);
                return L.circleMarker(latlng, {
                    radius: 5,
                    fillColor: isZdolano ? COLOR_ZDOLANO : defaultColor,
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8,
                    pane: 'markerPane'
                });
            },
            
            onEachFeature: function (feature, layer) {
                const peakId = feature.properties.OBJECTID;
                const props = feature.properties;
                if (!peakId) {
                    let simplePopup = `<strong>${props.name || 'Peak without name'}</strong>`;
                    if (props.ele) simplePopup += `<br>${props.ele} m a.s.l.`;
                    simplePopup += `<div class="popup-checkbox-container"><em>(This peak cannot be saved - missing ID)</em></div>`;
                    layer.bindPopup(simplePopup);
                    return;
                }
                peakLayerMap.set(peakId, layer);

                const allData = getPeakData();
                const isZdolano = allData.hasOwnProperty(peakId);
                if (isZdolano) {
                    layer.bindTooltip(`<span class="climbed-label">${props.name} ✅</span>`, {
                        permanent: true,
                        className: 'climbed-tooltip',
                        direction: 'top',
                        offset: [0, -10]
                    });
                }

                layer.bindPopup(function () {
                    const defaultColor = getPeakColor(props.stat);
                    const currentData = getPeakData();
                    const peakInfo = currentData[peakId];
                    const isChecked = !!peakInfo;
                    const dateValue = (peakInfo && peakInfo.datum) ? peakInfo.datum : "";
                    const elevValue = (peakInfo && peakInfo.elevace) ? peakInfo.elevace : "";

                    let popupText = `<strong>${props.name || 'Peak without name'}</strong>`;
                    if (props.ele) {
                        popupText += `<br>${props.ele} m a.s.l.`;
                    }
                    popupText += `
                        <div class="popup-checkbox-container">
                            <hr>
                            <div>
                                <input type="checkbox" id="peak-${peakId}" ${isChecked ? 'checked' : ''} >
                                <label for="peak-${peakId}"> Climbed</label>
                            </div>
                            <div class="popup-date-container">
                                <label for="date-${peakId}">Date:</label>
                                <input type="date" id="date-${peakId}" value="${dateValue}">
                            </div>
                            <div class="popup-elevation-container">
                                <label for="elev-${peakId}">Elevation gain:</label>
                                <input type="number" id="elev-${peakId}" value="${elevValue}" placeholder="meters">
                            </div>
                            <button type="button" class="popup-save-button" 
                                onclick="savePeakClimb(${peakId}, '${defaultColor}')">
                                Save
                            </button>
                        </div>
                    `;
                    return popupText;
                });
            }
        });

        vrcholyGeoJSONLayer.addTo(vrcholyGroup);
        vrcholyGroup.addTo(map);

        // --- PŘIDÁNÍ HLEDACÍHO POLE ---
        const searchControl = new L.Control.Search({
            layer: vrcholyGeoJSONLayer, 
            propertyName: 'name',
            marker: false,
            initial: false,
            textPlaceholder: 'Search for a peak...',
            moveToLocation: function(latlng, title, map) {
                map.setView(latlng, 14); 
            }
        });
        searchControl.on('search:locationfound', function(e) {
            e.layer.openPopup();
        });
        map.addControl(searchControl);
        
        // --- PŘIDÁNÍ NOVÉHO FILTRU VÝŠKY ---
        altitudeFilterControl.addTo(map);
        document.getElementById('min-alt').placeholder = minEle;
        document.getElementById('max-alt').placeholder = maxEle;
        // ---------------------------------

        // --- INICIALIZACE VŠEHO OSTATNÍHO ---
        initializeDashboard();
        updateCounter();
        createCheckpoints();
        updatePeakList();
        updateDashboard(); 
    })
    .catch(err => console.error('Error loading VrcholyAll.geojson:', err));

// Načtení Perimetru Alp
fetch('data/Alpine_Convention_Perimeter_2025.geojson')
    .then(response => response.json())
    .then(data => {
        const perimeterLayer = L.geoJSON(data, {
            style: { color: "#ca6ee6", weight: 2, fillOpacity: 0, interactive: false }
        });
        const alpsBounds = perimeterLayer.getBounds();
        map.fitBounds(alpsBounds);
        map.setMaxBounds(alpsBounds.pad(0.1)); 
        perimeterLayer.addTo(perimeterGroup);
        perimeterGroup.addTo(map);
    })
    .catch(err => console.error('Error loading Alpine_Convention_Perimeter_2025.geojson:', err));

// Načtení GADM hranic
const hraniceStyle = { weight: 2, fillOpacity: 0, interactive: false };
fetch('data/gadm41_AUT_0.json').then(r => r.json()).then(d => L.geoJSON(d, { style: { ...hraniceStyle, color: "#e66e6e" } }).addTo(autGroup));
fetch('data/gadm41_ITA_0.json').then(r => r.json()).then(d => L.geoJSON(d, { style: { ...hraniceStyle, color: "#74e66e" } }).addTo(itaGroup));
fetch('data/gadm41_CHE_0.json').then(r => r.json()).then(d => L.geoJSON(d, { style: { ...hraniceStyle, color: "#6e77e6" } }).addTo(cheGroup));
fetch('data/gadm41_FRA_0.json').then(r => r.json()).then(d => L.geoJSON(d, { style: { ...hraniceStyle, color: "#6ea7e6" } }).addTo(fraGroup));
fetch('data/gadm41_DEU_0.json').then(r => r.json()).then(d => L.geoJSON(d, { style: { ...hraniceStyle, color: "#000000" } }).addTo(deuGroup));
fetch('data/gadm41_SVN_0.json').then(r => r.json()).then(d => L.geoJSON(d, { style: { ...hraniceStyle, color: "#e6c36e" } }).addTo(svnGroup));

/* === PŘIDÁNÍ LEGENDY DO MAPY === */
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'legend-container-map');
    div.innerHTML = `
        <h4>Peak Color Legend:</h4>
        <ul class="legend-list">
            <li><span class="legend-color" style="background-color: #e66e6e;"></span> Austria</li>
            <li><span class="legend-color" style="background-color: #74e66e;"></span> Italy</li>
            <li><span class="legend-color" style="background-color: #e66ec8;"></span> Switzerland</li>
            <li><span class="legend-color" style="background-color: #6ea7e6;"></span> France</li>
            <li><span class="legend-color" style="background-color: #000000;"></span> Germany</li>
            <li><span class="legend-color" style="background-color: #e6c36e;"></span> Slovenia</li>
            <li><span class="legend-color" style="background-color: #808080;"></span> Other</li>
            <li class="legend-separator"></li>
            <li><span class="legend-color" style="background-color: #ffd700;"></span> Climbed</li>
        </ul>
    `;
    L.DomEvent.disableClickPropagation(div);
    return div;
};
legend.addTo(map);

/* === SPOUŠTĚCÍ KÓD PRO TÉMA === */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('theme-toggle-checkbox').addEventListener('change', (e) => {
        setTheme(e.target.checked ? 'dark' : 'light');
    });
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
    setTheme(savedTheme);
});