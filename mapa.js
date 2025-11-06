// 1. Inicializujeme mapu a řekneme jí, ať se vloží do prvku s ID 'mapa'
//    Nastavíme střed na Alpy (souřadnice [46.5, 10.5]) a úroveň přiblížení (zoom 8)
const map = L.map('mapa').setView([46.5, 10.5], 8);

// 2. Přidáme vrstvu dlaždic (tu podkladovou mapu) z OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    // Přidáme povinné uvedení zdroje
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// ... (zde je váš stávající kód pro 'map' a 'L.tileLayer') ...


// 3. PŘIDÁNÍ VAŠÍ VRSTVY GEOJSON
// --------------------------------------------------

// Použijeme funkci 'fetch' pro načtení souboru z cesty 'data/VrcholyAlpy.geojson'
fetch('data/VrcholyAlpy.geojson')
    .then(response => {
        // Zkontrolujeme, zda server soubor našel
        if (!response.ok) {
            throw new Error('Soubor GeoJSON nebyl nalezen!');
        }
        return response.json(); // Převedeme odpověď na formát JSON
    })
    .then(data => {
        // Pokud se načtení podařilo, data (GeoJSON) přidáme do mapy
        L.geoJSON(data, {
            
            // Tato funkce se postará o styl bodů (změníme modré značky na oranžová kolečka)
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 5,
                    fillColor: "#ff7800",
                    color: "#000",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.8
                });
            },

            // Tato funkce se spustí pro každý prvek (vrchol)
            onEachFeature: function (feature, layer) {
                // Zkontrolujeme, zda má vrchol v datech nějaké "vlastnosti"
                if (feature.properties) {
                    
                    // Sestavíme text, který se ukáže v okýnku po kliknutí
                    // PŘEDPOKLÁDÁM, že vaše sloupce v GeoJSON se jmenují 'name' a 'ele'
                    // Pokud se jmenují jinak, musíte 'name' a 'ele' přepsat zde:
                    
                    let popupText = `<strong>${feature.properties.name}</strong>`;
                    
                    if (feature.properties.ele) {
                        popupText += `<br>${feature.properties.ele} m n. m.`;
                    }
                    
                    // "Přilepíme" okýnko (popup) na vrstvu
                    layer.bindPopup(popupText);
                }
            }
        }).addTo(map); // Přidáme celou GeoJSON vrstvu do mapy
    })
    .catch(err => {
        // Pokud nastala chyba (např. špatný název souboru), vypíše ji do konzole
        console.error('Chyba při načítání vrstvy VrcholyAlpy.geojson:', err);
        alert('Nepodařilo se načíst data vrcholů. Zkontrolujte název souboru a konzoli (F12).');
    });
console.log("Mapa byla úspěšně inicializována.");