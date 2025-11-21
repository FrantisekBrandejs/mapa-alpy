/* === GLOBAL CONSTANTS & VARIABLES === */
const STORAGE_KEY_DATA = 'zdolaneVrcholyData';
// STORAGE_KEY_THEME removed
const COLOR_ZDOLANO = "#00112eff"; 

// Shared global state
window.peakLayerMap = new Map();
window.totalPeakCount = 0;
window.allPeaksData = []; 
window.elevationChart = null;
window.vrcholyGeoJSONLayer = null; 

/* === STORAGE FUNCTIONS === */
function getPeakData() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_DATA);
        return data ? JSON.parse(data) : {};
    } catch (e) { return {}; }
}

function savePeakData(data) {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
}

/* === BACKUP FUNCTIONS === */
function downloadBackup(sourceGeoJsonFeatures) {
    const featuresToUse = sourceGeoJsonFeatures || window.allPeaksData;

    if (!featuresToUse || featuresToUse.length === 0) {
        alert("Data is not loaded yet.");
        return;
    }

    const climbedData = getPeakData();
    let exportFeatures = [];

    featuresToUse.forEach(feature => {
        const id = feature.properties.OBJECTID;
        if (climbedData.hasOwnProperty(id)) {
            let newProperties = { ...feature.properties };
            newProperties.user_status = 'climbed';
            newProperties.user_date = climbedData[id].datum || null;
            newProperties.user_elevation_gain = climbedData[id].elevace || null;

            exportFeatures.push({
                type: "Feature",
                geometry: feature.geometry,
                properties: newProperties
            });
        }
    });

    if (exportFeatures.length === 0) {
        alert("No climbed peaks to export.");
        return;
    }

    const geoJsonOutput = {
        type: "FeatureCollection",
        name: "Alpine_Climbed_Peaks",
        features: exportFeatures
    };

    const dataStr = JSON.stringify(geoJsonOutput, null, 2);
    const blob = new Blob([dataStr], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `climbed_peaks_${date}.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function restoreBackup(jsonContent) {
    try {
        const geoJson = JSON.parse(jsonContent);
        if (!geoJson.features || !Array.isArray(geoJson.features)) throw new Error("Invalid GeoJSON");

        let newClimbedData = {};
        let count = 0;

        geoJson.features.forEach(f => {
            const props = f.properties;
            const id = props.OBJECTID;
            if (id && props.user_status === 'climbed') {
                newClimbedData[id] = {
                    datum: props.user_date || null,
                    elevace: props.user_elevation_gain || null
                };
                count++;
            }
        });

        savePeakData(newClimbedData);
        alert(`Restored ${count} climbed peaks. Reloading...`);
        location.reload();
    } catch (e) {
        console.error(e);
        alert("Error importing file.");
    }
}