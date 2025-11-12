/* === SYSTÉM PRO UKLÁDÁNÍ ZDOLANÝCH VRCHOLŮ === */
const STORAGE_KEY_DATA = 'zdolaneVrcholyData';
const STORAGE_KEY_THEME = 'appTheme';
const STORAGE_KEY_WISHLIST = 'alpineWishlist'; // <-- NOVÝ KLÍČ

/**
 * Načte VŠECHNA data o vrcholech z localStorage
 */
function getPeakData() {
    const data = localStorage.getItem(STORAGE_KEY_DATA);
    return data ? JSON.parse(data) : {};
}

/**
 * Uloží VŠECHNA data o vrcholech
 * @param {object} data - Objekt se všemi daty
 */
function savePeakData(data) {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(data));
}

/* === NOVÉ FUNKCE PRO WISHLIST === */

/**
 * Načte seznam ID vrcholů z wishlistu
 */
function getWishlist() {
    const data = localStorage.getItem(STORAGE_KEY_WISHLIST);
    // Vrací pole [123, 456, ...]
    return data ? JSON.parse(data) : [];
}

/**
 * Uloží seznam ID vrcholů do wishlistu
 * @param {number[]} ids - Pole čísel (OBJECTID)
 */
function saveWishlist(ids) {
    localStorage.setItem(STORAGE_KEY_WISHLIST, JSON.stringify(ids));
}