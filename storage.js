/* === GLOBÁLNÍ PROMĚNNÉ (Musí být načteny jako první) === */
const STORAGE_KEY_DATA = 'zdolaneVrcholyData';
const STORAGE_KEY_THEME = 'appTheme';
const STORAGE_KEY_WISHLIST = 'alpineWishlist';
const COLOR_ZDOLANO = "#9BEEEE"; // Tyrkysová pro "Zdoláno"

// Proměnné sdílené mezi soubory
let peakLayerMap = new Map();
let totalPeakCount = 0;
let allPeaksData = []; 
let elevationChart = null;
let vrcholyGeoJSONLayer = null; // Pro filtrování v mapě

/* === FUNKCE PRO UKLÁDÁNÍ (LocalStorage) === */

function getPeakData() {
    const data = localStorage.getItem(STORAGE_KEY_DATA);
    return data ? JSON.parse(data) : {};
}

function savePeakData(data) {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
}

/* === FUNKCE PRO WISHLIST === */

function getWishlist() {
    const data = localStorage.getItem(STORAGE_KEY_WISHLIST);
    return data ? JSON.parse(data) : [];
}

function saveWishlist(ids) {
    localStorage.setItem(STORAGE_KEY_WISHLIST, JSON.stringify(ids));
}

/* === FUNKCE PRO ZÁLOHU (Export/Import) === */
function downloadBackup() {
    const backupData = {
        climbed: localStorage.getItem(STORAGE_KEY_DATA) || "{}",
        wishlist: localStorage.getItem(STORAGE_KEY_WISHLIST) || "[]",
        theme: localStorage.getItem(STORAGE_KEY_THEME) || "light"
    };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `alpske_vrcholy_zaloha_${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function restoreBackup(jsonContent) {
    try {
        const data = JSON.parse(jsonContent);
        if (data.climbed && data.wishlist) {
            localStorage.setItem(STORAGE_KEY_DATA, data.climbed);
            localStorage.setItem(STORAGE_KEY_WISHLIST, data.wishlist);
            if (data.theme) localStorage.setItem(STORAGE_KEY_THEME, data.theme);
            alert("Data byla úspěšně obnovena! Stránka se nyní obnoví.");
            location.reload();
        } else {
            alert("Chyba: Soubor neobsahuje platná data.");
        }
    } catch (e) {
        console.error(e);
        alert("Chyba: Soubor je poškozený.");
    }
}