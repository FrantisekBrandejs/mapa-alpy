/* === HLAVNÍ LOGIKA MAPY === */

function savePeakClimb(peakId, defaultColor) {
    if (!peakId) return;
    const checkbox = document.getElementById(`peak-${peakId}`);
    const dateInput = document.getElementById(`date-${peakId}`);
    const elevInput = document.getElementById(`elev-${peakId}`);
    const isChecked = checkbox.checked;
    
    const dateValue = dateInput ? dateInput.value : null;
    const elevValue = elevInput ? elevInput.value : null;

    let allData = getPeakData(); 
    const layer = window.peakLayerMap.get(peakId);
    const props = layer.feature.properties; 

    if(layer) layer.unbindTooltip();

    if (isChecked) {
        allData[peakId] = { 
            datum: dateValue,
            elevace: elevValue
        };
        if (layer) {
            layer.setStyle({ fillColor: window.COLOR_ZDOLANO });
            layer.bindTooltip(`<span class="climbed-label">${props.name} </span>`, {
                permanent: true, className: 'climbed-tooltip', direction: 'top', offset: [0, -10]
            });
        }
    } else {
        delete allData[peakId];
        if (layer) {
            layer.setStyle({ fillColor: defaultColor });
        }
    }
    
    savePeakData(allData);
    updatePeakList(); 
    updateDashboard();
    map.closePopup();
}

// Mapa Init
const map = L.map('mapa');
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OSM', minZoom: 6 });
const API_KEY = 'mH-sjNiciF2i0Kq9leYtcUYXXak3-quskLtbyfNYFUA';
const mapyCz = L.tileLayer(`https://api.mapy.com/v1/maptiles/outdoor/256/{z}/{x}/{y}?apikey=${API_KEY}`, { minZoom: 6, attribution: '&copy; Seznam.cz' });
const mapyCzWinter = L.tileLayer(`https://api.mapy.com/v1/maptiles/winter/256/{z}/{x}/{y}?apikey=${API_KEY}`, { minZoom: 6, attribution: '&copy; Seznam.cz' });
const mapyCzAerial = L.tileLayer(`https://api.mapy.com/v1/maptiles/aerial/256/{z}/{x}/{y}?apikey=${API_KEY}`, { minZoom: 6, attribution: '&copy; Seznam.cz' });

osm.addTo(map);

const vrcholyGroup = L.layerGroup();
const perimeterGroup = L.layerGroup();


const baseMaps = { "OpenStreetMap": osm, "Outdoor": mapyCz, "Winter": mapyCzWinter, "Aerial": mapyCzAerial};
const overlayMaps = { "Alpine Peaks": vrcholyGroup, "Perimeter": perimeterGroup};

L.control.layers(baseMaps, overlayMaps).addTo(map);

// Filtr
function filterPeaks() {
    const minInput = document.getElementById('min-alt');
    const maxInput = document.getElementById('max-alt');
    if(!minInput || !maxInput) return;

    const min = parseInt(minInput.value, 10) || 0;
    const max = parseInt(maxInput.value, 10) || 9999;

    if (!window.vrcholyGeoJSONLayer) return;

    window.vrcholyGeoJSONLayer.eachLayer((layer) => {
        const ele = layer.feature.properties.ele;
        if (ele >= min && ele <= max) {
            layer.setStyle({ opacity: 1, fillOpacity: 0.8 });
            if (layer.getTooltip() && layer.getTooltip()._container) layer.getTooltip()._container.style.display = 'block';
        } else {
            layer.setStyle({ opacity: 0, fillOpacity: 0 });
            if (layer.getTooltip() && layer.getTooltip()._container) layer.getTooltip()._container.style.display = 'none';
        }
    });
}

const altitudeFilterControl = L.control({ position: 'topleft' });
altitudeFilterControl.onAdd = function (map) {
    const container = L.DomUtil.create('div', 'leaflet-control-altitude-filter leaflet-bar');
    L.DomEvent.disableClickPropagation(container);
    container.innerHTML = `
        <label class="altitude-filter-label">Altitude Filter:</label>
        <div class="altitude-filter-inputs">
            <input type="number" id="min-alt" placeholder="Min">
            <input type="number" id="max-alt" placeholder="Max">
        </div>
        <div class="altitude-filter-buttons">
            <button class="altitude-filter-button" onclick="filterPeaks()">Filter</button>
            <button class="altitude-filter-reset-button" onclick="document.getElementById('min-alt').value='';document.getElementById('max-alt').value='';filterPeaks()">Reset</button>
        </div>
    `;
    return container;
};
altitudeFilterControl.addTo(map);

// Načtení dat
fetch('data/VrcholyAll.geojson') 
    .then(r => r.json())
    .then(data => {
        window.allPeaksData = data.features;
        window.totalPeakCount = data.features.length;
        const peakData = getPeakData();

        let minEle = 9999, maxEle = 0;
        window.allPeaksData.forEach(f => { 
            const ele = f.properties.ele;
            if(ele) { if(ele < minEle) minEle = ele; if(ele > maxEle) maxEle = ele; }
        });
        if(document.getElementById('min-alt')) document.getElementById('min-alt').placeholder = Math.floor(minEle/100)*100;
        if(document.getElementById('max-alt')) document.getElementById('max-alt').placeholder = Math.ceil(maxEle/100)*100;

        window.vrcholyGeoJSONLayer = L.geoJSON(data, {
            pointToLayer: (f, latlng) => {
                const id = f.properties.OBJECTID;
                const isClimbed = peakData.hasOwnProperty(id);
                const color = getPeakColor(f.properties.stat) || '#808080';
                return L.circleMarker(latlng, {
                    radius: 4, fillColor: isClimbed ? window.COLOR_ZDOLANO : color, color: "#00112eff", weight: 0.4, opacity: 1, fillOpacity: 0.8, pane: 'markerPane'
                });
            },
            onEachFeature: (f, layer) => {
                const id = f.properties.OBJECTID;
                const props = f.properties;
                if (!id) return;

                window.peakLayerMap.set(id, layer);

                if (peakData.hasOwnProperty(id)) {
                    layer.bindTooltip(`<span class="climbed-label">${props.name} </span>`, { permanent: true, className: 'climbed-tooltip', direction: 'top', offset: [0, -10] });
                }

                layer.bindPopup(() => {
                    const color = getPeakColor(props.stat) || '#808080';
                    const info = getPeakData()[id];
                    const checked = !!info;
                    return `
                        <div class="popup-checkbox-container">
                            <div><strong>${props.name}</strong><br>${props.ele} m a.s.l.</div>
                            <hr>
                            <div><input type="checkbox" id="peak-${id}" ${checked ? 'checked' : ''}><label for="peak-${id}"> Climbed</label></div>
                            <div class="popup-date-container"><label>Date:</label><input type="date" id="date-${id}" value="${info?.datum || ''}"></div>
                            <div class="popup-elevation-container"><label>Elev. gain:</label><input type="number" id="elev-${id}" value="${info?.elevace || ''}" placeholder="m"></div>
                            <button class="popup-save-button" onclick="savePeakClimb(${id}, '${color}')">Save</button>
                        </div>
                    `;
                });
            }
        });
        window.vrcholyGeoJSONLayer.addTo(vrcholyGroup);
        vrcholyGroup.addTo(map);

        const searchControl = new L.Control.Search({ layer: window.vrcholyGeoJSONLayer, propertyName: 'name', marker: false, initial: false, moveToLocation: (latlng, title, map) => map.setView(latlng, 14) });
        searchControl.on('search:locationfound', e => e.layer.openPopup());
        map.addControl(searchControl);

        initializeDashboard();
        updatePeakList();
        updateDashboard();
    })
    .catch(e => console.error('Error loading peaks:', e));

const gs = { weight: 2, fillOpacity: 0, interactive: false };
fetch('data/Alpine_Convention_Perimeter_2025.geojson').then(r=>r.json()).then(d=>{ L.geoJSON(d, {style:{color:"#2a5298", weight:3, fillOpacity:0, interactive:false}}).addTo(perimeterGroup).addTo(map); map.fitBounds(L.geoJSON(d).getBounds());});

// --- LEGENDA (Schovávací) ---
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function (map) {
    const container = L.DomUtil.create('div', 'leaflet-control-legend leaflet-bar');
    L.DomEvent.disableClickPropagation(container);

    // Ikonka (paleta)
    const toggle = L.DomUtil.create('a', 'legend-toggle', container);
    toggle.href = '#';
    toggle.title = 'Legend';
    toggle.innerHTML = '🗺️';

    // Obsah
    const content = L.DomUtil.create('div', 'legend-content', container);
    content.innerHTML = `
        <h4>Peak Color Legend</h4>
        <ul class="legend-list">
            <li><span class="legend-color" style="background:#FD6D5D"></span> Austria</li>
            <li><span class="legend-color" style="background:#6bb36dff"></span> Italy</li>
            <li><span class="legend-color" style="background:#d66fb0ff"></span> Switzerland</li>
            <li><span class="legend-color" style="background:#6aa0f0ff"></span> France</li>
            <li><span class="legend-color" style="background:#fae94dff"></span> Germany</li>
            <li><span class="legend-color" style="background:#b1f82eff"></span> Slovenia</li>
            <li class="legend-separator"></li>
            <li><span class="legend-color" style="background:#00112eff"></span> Climbed</li>
        </ul>
    `;

    // Hover efekty
    container.onmouseenter = function() { container.classList.add('legend-expanded'); };
    container.onmouseleave = function() { container.classList.remove('legend-expanded'); };
    toggle.onclick = function(e) { e.preventDefault(); }; // Pro dotyková zařízení

    return container;
};
legend.addTo(map);

// Aktivace tlačítek
document.addEventListener('DOMContentLoaded', () => {
    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            downloadBackup(window.allPeaksData);
        });
    }

    const btnImport = document.getElementById('btn-import');
    const fileInput = document.getElementById('file-import');
    if (btnImport && fileInput) {
        btnImport.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if(confirm("Overwrite data?")) restoreBackup(ev.target.result);
                fileInput.value = '';
            };
            reader.readAsText(file);
        });
    }
});