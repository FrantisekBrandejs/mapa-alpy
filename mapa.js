/* === SYSTÉM PRO UKLÁDÁNÍ ZDOLANÝCH VRCHOLŮ === */
const STORAGE_KEY = 'zdolaneVrcholyData';
const COLOR_ZDOLANO = "#ffd700";
let peakLayerMap = new Map();
let totalPeakCount = 0;
let allPeaksData = []; // Všechna data z GeoJSON
let elevationChart = null; // Proměnná pro graf

function getPeakData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
}

function savePeakData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function updateCounter() {
    const peakData = getPeakData();
    const zdolanocount = Object.keys(peakData).length;
    const totalCount = totalPeakCount;
    if (totalCount === 0) return;
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

/**
 * Najde vrchol na mapě a otevře jeho popup pro editaci
 */
function editPeak(peakId) {
    if (!peakId) return;
    const layer = peakLayerMap.get(peakId); // Najdeme vrstvu (bod)
    if (layer) {
        layer.openPopup(); // Otevřeme její popup
    }
}

/**
 * Aktualizuje seznam zdolaných vrcholů v postranním panelu
 * (Nový layout: Jméno / Výška / Elevace / Stát+Datum / Tlačítko)
 */
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
                ele: feature.properties.ele, // ZNOVU PŘIDÁNO
                stat: feature.properties.stat,
                datum: peakData[peakId].datum,
                elevace: peakData[peakId].elevace // ZNOVU PŘIDÁNO
            });
        }
    }

    // Seřadíme vrcholy podle data
    climbedPeaksInfo.sort((a, b) => {
        if (a.datum && b.datum) return b.datum.localeCompare(a.datum);
        if (a.datum && !b.datum) return -1;
        if (!a.datum && b.datum) return 1;
        return 0;
    });

    if (climbedPeaksInfo.length === 0) {
        listEl.innerHTML = '<li>Žádné vrcholy zatím nebyly zdolány.</li>';
    } else {
        for (const peak of climbedPeaksInfo) {
            const li = document.createElement('li');
            
            // Příprava textů
            const dateStr = formatDate(peak.datum);
            const countryName = getCountryName(peak.stat);
            const altitudeStr = peak.ele ? `${peak.ele} m n. m.` : '---';
            let elevStr = '---';
            if (peak.elevace) {
                elevStr = `${peak.elevace} m ⬆️`;
            }

            // Sestavíme HTML podle nového layoutu
            li.innerHTML = `
                <strong class="peak-list-name">${peak.name}</strong>
                
                <small class="peak-list-details">${altitudeStr}</small>
                
                <small class="peak-list-elevation">${elevStr}</small>
                
                <span class="peak-list-country">${countryName}</span>
                
                <small class="peak-list-date">${dateStr}</small>
                
                <button class="edit-peak-emoji-btn" 
                        title="Upravit záznam" 
                        onclick="editPeak(${peak.id})">
                    ✏️
                </button>
            `;
            listEl.appendChild(li);
        }
    }
}


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

    let allData = getPeakData();
    const layer = peakLayerMap.get(peakId);

    if (isChecked) {
        allData[peakId] = { 
            datum: dateValue || null,
            elevace: elevValue || null
        };
        if (layer) layer.setStyle({ fillColor: COLOR_ZDOLANO });
    } else {
        delete allData[peakId];
        if (layer) layer.setStyle({ fillColor: defaultColor });
    }
    
    savePeakData(allData);
    
    updateCounter();
    updatePeakList();
    updateDashboard(); // Aktualizujeme graf
    
    map.closePopup();
}

/**
 * Inicializuje graf a filtry
 */
function initializeDashboard() {
    const ctx = document.getElementById('elevation-chart').getContext('2d');
    elevationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Nastoupané metry',
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
            scales: { y: { beginAtZero: true } }
        }
    });

    document.getElementById('filter-country').addEventListener('change', updateDashboard);
    document.getElementById('filter-date-from').addEventListener('change', updateDashboard);
    document.getElementById('filter-date-to').addEventListener('change', updateDashboard);
}

/**
 * Překreslí graf a statistiky podle filtrů
 */
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
    let count4000 = 0; 
    let countOther = 0; 

    for (const peakId in peakData) {
        const feature = allPeaksData.find(f => f.properties.OBJECTID == peakId);
        if (!feature) continue;
        
        const props = feature.properties;
        const climbData = peakData[peakId];
        
        // --- APLIKUJEME FILTRY ---
        if (filterCountry !== 'ALL' && props.stat !== filterCountry) continue;
        if (filterDateFrom && climbData.datum && climbData.datum < filterDateFrom) continue;
        if (filterDateTo && climbData.datum && climbData.datum > filterDateTo) continue;
        // --- KONEC FILTRŮ ---
        
        // Počítadlo 4000m
        if (props.ele && props.ele >= 4000) {
            count4000++;
        } else {
            countOther++;
        }
        
        // Graf elevace
        const elevace = parseInt(climbData.elevace, 10) || 0;
        if (elevace > 0) {
            if (stats.hasOwnProperty(props.stat)) {
                stats[props.stat] += elevace;
            }
        }
        totalElevationSum += elevace; // Součet pro "Celkem nastoupáno"
    }

    // Aktualizujeme HTML
    document.getElementById('total-elevation-sum').innerText = `${totalElevationSum.toLocaleString('cs-CZ')} m ⬆️`;
    document.getElementById('stat-count-4000').innerText = count4000;
    document.getElementById('stat-count-other').innerText = countOther;
    
    // Aktualizujeme graf
    if (elevationChart) {
        let labels = [];
        let data = [];
        let colors = [];
        
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
/* === KONEC SYSTÉMU PRO UKLÁDÁNÍ === */


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
    "Ortofoto Esri": Esri_WorldImagery,
    "Mapy.cz Zima": mapyCzWinter,
    "Mapy.cz Letecká": mapyCzAerial
};
const overlayMaps = {
    "🏔️ Vrcholy Alp": vrcholyGroup,
    "📍 Perimetr Alp": perimeterGroup,
    "🇦🇹 Rakousko": autGroup,
    "🇮🇹 Itálie": itaGroup,
    "🇨🇭 Švýcarsko": cheGroup,
    "🇫🇷 Francie": fraGroup,
    "🇩🇪 Německo": deuGroup,
    "🇸🇮 Slovinsko": svnGroup
};
L.control.layers(baseMaps, overlayMaps).addTo(map);

// 5. Načtení všech vašich dat
// Funkce pro získání barvy podle země
function getPeakColor(stat) {
    switch (stat) {
        case 'AUT': return '#e66e6e';
        case 'ITA': return '#74e66e';
        case 'CHE': return '#e66ec8'; // Opraveno
        case 'FRA': return '#6ea7e6';
        case 'DEU': return '#000000';
        case 'SVN': return '#e6c36e';
        default:    return '#808080';
    }
}

// Funkce pro vlajky
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

// POMOCNÁ FUNKCE PRO NÁZEV STÁTU
function getCountryName(stat) {
    switch (stat) {
        case 'AUT': return 'Rakousko';
        case 'ITA': return 'Itálie';
        case 'CHE': return 'Švýcarsko';
        case 'FRA': return 'Francie';
        case 'DEU': return 'Německo';
        case 'SVN': return 'Slovinsko';
        default:    return 'Neznámý';
    }
}

// POMOCNÁ FUNKCE PRO FORMÁT DATA
function formatDate(isoDate) {
    if (!isoDate || isoDate === "") {
        return '---'; // Vrátí, pokud datum není zadáno
    }
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


// Načtení vrstvy vrcholů s popupy
fetch('data/VrcholyAlpy.geojson')
    .then(response => response.json())
    .then(data => {
        
        allPeaksData = data.features;
        totalPeakCount = data.features.length; 
        
        const peakData = getPeakData();

        const vrcholyGeoJSONLayer = L.geoJSON(data, {
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
            
            // Přidání POPUPU (Dynamická verze)
            onEachFeature: function (feature, layer) {
                const peakId = feature.properties.OBJECTID;
                const props = feature.properties;
                if (!peakId) {
                    let simplePopup = '';
                    if (props.name) simplePopup += `<strong>${props.name}</strong>`;
                    if (props.ele) simplePopup += `<br>${props.ele} m n. m.`;
                    simplePopup += `<div class="popup-checkbox-container"><em>(Tento vrchol nelze uložit - chybí ID)</em></div>`;
                    layer.bindPopup(simplePopup);
                    return;
                }
                peakLayerMap.set(peakId, layer);

                layer.bindPopup(function () {
                    const defaultColor = getPeakColor(props.stat);
                    const allData = getPeakData();
                    const peakInfo = allData[peakId];
                    const isZdolano = !!peakInfo;
                    const dateValue = (peakInfo && peakInfo.datum) ? peakInfo.datum : "";
                    const elevValue = (peakInfo && peakInfo.elevace) ? peakInfo.elevace : "";

                    let popupText = '';
                    if (props.name) {
                        popupText += `<strong>${props.name}</strong>`;
                    } else {
                        popupText += '<em>Vrchol bez názvu</em>';
                    }
                    if (props.ele) {
                        popupText += `<br>${props.ele} m n. m.`;
                    }
                    popupText += `
                        <div class="popup-checkbox-container">
                            <hr>
                            <div>
                                <input 
                                    type="checkbox" 
                                    id="peak-${peakId}" 
                                    ${isZdolano ? 'checked' : ''} 
                                >
                                <label for="peak-${peakId}"> Zdoláno</label>
                            </div>
                            <div class="popup-date-container">
                                <label for="date-${peakId}">Dne:</label>
                                <input 
                                    type="date" 
                                    id="date-${peakId}" 
                                    value="${dateValue}"
                                >
                            </div>
                            <div class="popup-elevation-container">
                                <label for="elev-${peakId}">Elevace:</label>
                                <input 
                                    type="number" 
                                    id="elev-${peakId}" 
                                    value="${elevValue}"
                                    placeholder="metry"
                                >
                            </div>
                            <button 
                                type="button" 
                                class="popup-save-button" 
                                onclick="savePeakClimb(${peakId}, '${defaultColor}')"
                            >
                                Uložit
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
            textPlaceholder: 'Hledat vrchol...',
            moveToLocation: function(latlng, title, map) {
                map.setView(latlng, 14); 
            }
        });
        searchControl.on('search:locationfound', function(e) {
            e.layer.openPopup();
        });
        map.addControl(searchControl);
        
        // --- INICIALIZACE VŠEHO OSTATNÍHO ---
        initializeDashboard();
        updateCounter();
        createCheckpoints();
        updatePeakList();
        updateDashboard(); 
    })
    .catch(err => console.error('Chyba při načítání vrstvy VrcholyAlpy.geojson:', err));

// Načtení Perimetru Alp
fetch('data/Alpine_Convention_Perimeter_2025.geojson')
    .then(response => response.json())
    .then(data => {
        const perimeterLayer = L.geoJSON(data, {
            style: {
                color: "#ca6ee6",
                weight: 2,
                fillOpacity: 0,
                interactive: false
            }
        });
        const alpsBounds = perimeterLayer.getBounds();
        map.fitBounds(alpsBounds);
        map.setMaxBounds(alpsBounds.pad(0.1)); 
        perimeterLayer.addTo(perimeterGroup);
        perimeterGroup.addTo(map);
    })
    .catch(err => console.error('Chyba při načítání vrstvy Alpine_Convention_Perimeter_2025.geojson:', err));

// Načtení GADM hranic
const hraniceStyle = {
    weight: 2,
    fillOpacity: 0,
    interactive: false
};
fetch('data/gadm41_AUT_0.json')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, { style: { ...hraniceStyle, color: "#e66e6e" } }).addTo(autGroup);
    })
    .catch(err => console.error('Chyba při načítání vrstvy gadm41_AUT_0.json:', err));
fetch('data/gadm41_ITA_0.json')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, { style: { ...hraniceStyle, color: "#74e66e" } }).addTo(itaGroup);
    })
    .catch(err => console.error('Chyba při načítání vrstvy gadm41_ITA_0.json:', err));
fetch('data/gadm41_CHE_0.json')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, { style: { ...hraniceStyle, color: "#6e77e6" } }).addTo(cheGroup);
    })
    .catch(err => console.error('Chyba při načítání vrstvy gadm41_CHE_0.json:', err));
fetch('data/gadm41_FRA_0.json')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, { style: { ...hraniceStyle, color: "#6ea7e6" } }).addTo(fraGroup);
    })
    .catch(err => console.error('Chyba při načítání vrstvy gadm41_FRA_0.json:', err));
fetch('data/gadm41_DEU_0.json')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, { style: { ...hraniceStyle, color: "#000000" } }).addTo(deuGroup);
    })
    .catch(err => console.error('Chyba při načítání vrstvy gadm41_DEU_0.json:', err));
fetch('data/gadm41_SVN_0.json')
    .then(response => response.json())
    .then(data => {
        L.geoJSON(data, { style: { ...hraniceStyle, color: "#e6c36e" } }).addTo(svnGroup);
    })
    .catch(err => console.error('Chyba při načítání vrstvy gadm41_SVN_0.json:', err));