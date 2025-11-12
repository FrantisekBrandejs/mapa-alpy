/* === GLOBÁLNÍ PROMĚNNÉ PRO APLIKACI === */
const COLOR_ZDOLANO = "#ffd700";
let peakLayerMap = new Map();
let totalPeakCount = 0;
let allPeaksData = []; // Všechna data z GeoJSON
let elevationChart = null; // Proměnná pro graf
let vrcholyGeoJSONLayer = null; // Vrstva vrcholů pro filtrování

/*
 * ===============================================
 * FUNKCE SPOJENÉ S MAPOU (Leaflet)
 * ===============================================
 */

/**
 * Tuto funkci bude volat "Uložit" tlačítko v popupu.
 */
function savePeakClimb(peakId, defaultColor) {
    if (!peakId) return;
    const checkbox = document.getElementById(`peak-${peakId}`);
    const dateInput = document.getElementById(`date-${peakId}`);
    const elevInput = document.getElementById(`elev-${peakId}`);
    const isChecked = checkbox.checked;
    const dateValue = dateInput.value;
    const elevValue = elevInput.value;

    let allData = getPeakData(); // Volá funkci z storage.js
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
    
    savePeakData(allData); // Volá funkci z storage.js
    
    // Volá funkce z ui.js
    updateCounter();
    updatePeakList();
    updateDashboard();
    
    map.closePopup();
}

/**
 * Filtruje vrcholy na mapě podle hodnot v input polích
 */
function filterPeaks() {
    const minAltInput = document.getElementById('min-alt').value;
    const maxAltInput = document.getElementById('max-alt').value;
    
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
 * Vytvoříme nový ovládací prvek Leaflet pro filtr
 */
const altitudeFilterControl = L.control({ position: 'bottomright' }); // ZMĚNĚNÁ POZICE

altitudeFilterControl.onAdd = function (map) {
    const container = L.DomUtil.create('div', 'leaflet-control-altitude-filter leaflet-bar');
    L.DomEvent.disableClickPropagation(container);

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
    
    const buttonsDiv = L.DomUtil.create('div', 'altitude-filter-buttons', container);
    
    const filterButton = L.DomUtil.create('button', 'altitude-filter-button', buttonsDiv);
    filterButton.innerText = 'Filter';
    filterButton.onclick = filterPeaks;
    
    const resetButton = L.DomUtil.create('button', 'altitude-filter-reset-button', buttonsDiv);
    resetButton.innerText = 'Reset';
    resetButton.onclick = function() {
        minInput.value = '';
        maxInput.value = '';
        filterPeaks();
    };

    return container;
};
/* === KONEC OVLÁDACÍHO PRVKU FILTRU === */


/* === HLAVNÍ LOGIKA APLIKACE (Inicializace) === */

// 1. Inicializace mapy
const map = L.map('mapa');

// 2. Definice podkladových map
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 7
});
// Váš API klíč
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
// Načtení vrstvy vrcholů s popupy
fetch('data/VrcholyAll.geojson')
    .then(response => response.json())
    .then(data => {
        
        allPeaksData = data.features;
        totalPeakCount = data.features.length; 
        const peakData = getPeakData(); // Volá storage.js

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
                const defaultColor = getPeakColor(feature.properties.stat); // Volá helpers.js
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

                const allData = getPeakData(); // Volá storage.js
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
                    const defaultColor = getPeakColor(props.stat); // Volá helpers.js
                    const currentData = getPeakData(); // Volá storage.js
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

        // --- INICIALIZACE VŠEHO OSTATNÍHO (Volá funkce z ui.js) ---
        initializeDashboard();
        updateCounter();
        // createCheckpoints(); // Nyní voláno z updateCounter()
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
        setTheme(e.target.checked ? 'dark' : 'light'); // Volá funkci z ui.js
    });
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
    setTheme(savedTheme); // Volá funkci z ui.js
});