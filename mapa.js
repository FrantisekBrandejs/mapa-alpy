/* * HLAVNÍ LOGIKA MAPY 
 * (Pomocné funkce jsou v helpers.js, ui.js a storage.js)
 */

// 1. Inicializace mapy
const map = L.map('mapa');

// 2. Definice podkladových map
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 7
});
const API_KEY = 'mH-sjNiciF2i0Kq9leYtcUYXXak3-quskLtbyfNYFUA';
const mapyCz = L.tileLayer(`https://api.mapy.com/v1/maptiles/outdoor/256/{z}/{x}/{y}?apikey=${API_KEY}`, {
    minZoom: 7, attribution: '<a href="https://api.mapy.com/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
});
const mapyCzWinter = L.tileLayer(`https://api.mapy.com/v1/maptiles/winter/256/{z}/{x}/{y}?apikey=${API_KEY}`, {
    minZoom: 7, attribution: '<a href="https://api.mapy.com/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
});
const mapyCzAerial = L.tileLayer(`https://api.mapy.com/v1/maptiles/aerial/256/{z}/{x}/{y}?apikey=${API_KEY}`, {
    minZoom: 7, attribution: '<a href="https://api.mapy.com/copyright" target="_blank">&copy; Seznam.cz a.s. a další</a>',
});
osm.addTo(map);

// 3. Skupiny vrstev
const vrcholyGroup = L.layerGroup();
const perimeterGroup = L.layerGroup();

// 4. Ovládací panel vrstev
const baseMaps = {
    "Basic": osm,
    "Touristic": mapyCz,
    "Winter": mapyCzWinter,
    "Aerial": mapyCzAerial
};
const overlayMaps = {
    "Alpine Peaks": vrcholyGroup,
    "Alpine Perimeter": perimeterGroup,
};
L.control.layers(baseMaps, overlayMaps).addTo(map);

// 5. Načtení VRCHOLŮ
fetch('data/VrcholyAll.geojson')
    .then(response => response.json())
    .then(data => {
        
        // Inicializace globálních proměnných
        allPeaksData = data.features;
        totalPeakCount = data.features.length; 
        const peakData = getPeakData(); // ze storage.js

        // Zjištění min/max pro filtr
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

        // Vytvoření vrstvy
        vrcholyGeoJSONLayer = L.geoJSON(data, {
            pointToLayer: function (feature, latlng) {
                const peakId = feature.properties.OBJECTID;
                const isZdolano = peakData.hasOwnProperty(peakId);
                const defaultColor = getPeakColor(feature.properties.stat) || '#808080'; // z helpers.js
                return L.circleMarker(latlng, {
                    radius: 3,
                    fillColor: isZdolano ? COLOR_ZDOLANO : defaultColor,
                    color: "#000",
                    weight: 0.5,
                    opacity: 1,
                    fillOpacity: 0.8,
                    pane: 'markerPane'
                });
            },
            
            onEachFeature: function (feature, layer) {
                const peakId = feature.properties.OBJECTID;
                const props = feature.properties;
                if (!peakId) return;

                peakLayerMap.set(peakId, layer);

                // Trvalý popisek pokud je zdoláno
                if (peakData.hasOwnProperty(peakId)) {
                    layer.bindTooltip(`<span class="climbed-label">${props.name} ✅</span>`, {
                        permanent: true, className: 'climbed-tooltip', direction: 'top', offset: [0, -10]
                    });
                }

                // Popup na kliknutí
                layer.bindPopup(function () {
                    const defaultColor = getPeakColor(props.stat) || '#808080';
                    const currentData = getPeakData();
                    const peakInfo = currentData[peakId];
                    const isChecked = !!peakInfo;
                    const dateValue = (peakInfo && peakInfo.datum) ? peakInfo.datum : "";
                    const elevValue = (peakInfo && peakInfo.elevace) ? peakInfo.elevace : "";

                    let popupText = `<strong>${props.name || 'Peak'}</strong>`;
                    if (props.ele) popupText += `<br>${props.ele} m a.s.l.`;
                    
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

        // Hledání (Leaflet-Search)
        const searchControl = new L.Control.Search({
            layer: vrcholyGeoJSONLayer, 
            propertyName: 'name',
            marker: false,
            initial: false,
            textPlaceholder: 'Search for a peak...',
            moveToLocation: function(latlng, title, map) { map.setView(latlng, 14); }
        });
        searchControl.on('search:locationfound', function(e) { e.layer.openPopup(); });
        map.addControl(searchControl);
        
        // Filtr výšky (Nový ovládací prvek)
        altitudeFilterControl.addTo(map);
        if(document.getElementById('min-alt')) document.getElementById('min-alt').placeholder = minEle;
        if(document.getElementById('max-alt')) document.getElementById('max-alt').placeholder = maxEle;

        // Inicializace UI (funkce z ui.js)
        initializeDashboard();
        updateCounter();
        // createCheckpoints(); // (voláno z updateCounter)
        updatePeakList();
        updateDashboard(); 
    })
    .catch(err => console.error('Error loading VrcholyAll.geojson:', err));

/* === FUNKCE PRO ULOŽENÍ (Most mezi UI a Mapou) === */
// Tuto funkci necháváme zde, protože pracuje přímo s mapou (barvy, tooltips)
function savePeakClimb(peakId, defaultColor) {
    if (!peakId) return;
    const checkbox = document.getElementById(`peak-${peakId}`);
    const dateInput = document.getElementById(`date-${peakId}`);
    const elevInput = document.getElementById(`elev-${peakId}`);
    const isChecked = checkbox.checked;
    const dateValue = dateInput.value;
    const elevValue = elevInput.value;

    let allData = getPeakData(); // ze storage.js
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
                permanent: true, className: 'climbed-tooltip', direction: 'top', offset: [0, -10]
            });
        }
    } else {
        delete allData[peakId];
        if (layer) {
            layer.setStyle({ fillColor: defaultColor });
        }
    }
    
    savePeakData(allData); // do storage.js
    updateCounter(); // z ui.js
    updatePeakList(); // z ui.js
    updateDashboard(); // z ui.js
    map.closePopup();
}

// Funkce pro filtr výšky (používá mapové vrstvy)
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

// Ovládací prvek filtru
const altitudeFilterControl = L.control({ position: 'bottomright' });
altitudeFilterControl.onAdd = function (map) {
    const container = L.DomUtil.create('div', 'leaflet-control-altitude-filter leaflet-bar');
    L.DomEvent.disableClickPropagation(container);
    const label = L.DomUtil.create('label', 'altitude-filter-label', container);
    label.innerText = 'Altitude Filter:';
    const inputsDiv = L.DomUtil.create('div', 'altitude-filter-inputs', container);
    const minInput = L.DomUtil.create('input', '', inputsDiv);
    minInput.type = 'number'; minInput.id = 'min-alt'; minInput.placeholder = 'Min';
    const maxInput = L.DomUtil.create('input', '', inputsDiv);
    maxInput.type = 'number'; maxInput.id = 'max-alt'; maxInput.placeholder = 'Max';
    const buttonsDiv = L.DomUtil.create('div', 'altitude-filter-buttons', container);
    const filterButton = L.DomUtil.create('button', 'altitude-filter-button', buttonsDiv);
    filterButton.innerText = 'Filter'; filterButton.onclick = filterPeaks;
    const resetButton = L.DomUtil.create('button', 'altitude-filter-reset-button', buttonsDiv);
    resetButton.innerText = 'Reset';
    resetButton.onclick = function() { minInput.value = ''; maxInput.value = ''; filterPeaks(); };
    return container;
};


/* === OSTATNÍ VRSTVY (Perimetr a Hranice) === */
fetch('data/Alpine_Convention_Perimeter_2025.geojson').then(r => r.json()).then(d => {
    const layer = L.geoJSON(d, { style: { color: "#BC40ED", weight: 3, fillOpacity: 0, interactive: false } });
    map.fitBounds(layer.getBounds()); map.setMaxBounds(layer.getBounds().pad(0.1));
    layer.addTo(perimeterGroup); perimeterGroup.addTo(map);
}).catch(e => console.error(e));


/* === LEGENDA === */
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'legend-container-map');
    div.innerHTML = `
        <h4>Peak Color Legend:</h4>
        <ul class="legend-list">
            <li><span class="legend-color" style="background-color: #FE8B9E;"></span> Austria</li>
            <li><span class="legend-color" style="background-color: #83D897;"></span> Italy</li>
            <li><span class="legend-color" style="background-color: #EC9CD2;"></span> Switzerland</li>
            <li><span class="legend-color" style="background-color: #7681E5;"></span> France</li>
            <li><span class="legend-color" style="background-color: #F9ED62;"></span> Germany</li>
            <li><span class="legend-color" style="background-color: #A8FD5D;"></span> Slovenia</li>
            <li class="legend-separator"></li>
            <li><span class="legend-color" style="background-color: #9BEEEE;"></span> Climbed</li>
        </ul>
    `;
    L.DomEvent.disableClickPropagation(div);
    return div;
};
legend.addTo(map);

/* === INIT TÉMA === */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('theme-toggle-checkbox').addEventListener('change', (e) => {
        setTheme(e.target.checked ? 'dark' : 'light');
    });
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || 'light';
    setTheme(savedTheme);
});