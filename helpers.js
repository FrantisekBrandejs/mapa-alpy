/* === POMOCNÉ FUNKCE === */

// Funkce pro získání barvy podle země (NOVÉ BARVY)
function getPeakColor(stat) {
    switch (stat) {
        case 'AUT': return '#FE8B9E'; // Rakousko (Červená)
        case 'ITA': return '#83D897'; // Itálie (Zelená)
        case 'CHE': return '#EC9CD2'; // Švýcarsko (Vínová)
        case 'FRA': return '#7681E5'; // Francie (Modrá)
        case 'DEU': return '#F9ED62'; // Německo (Oranžová)
        case 'SVN': return '#A8FD5D'; // Slovinsko (Světle zelená)
        default:    return null;      // Ostatní (Ignorovat/Skrýt)
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
        default:    return '🏳️';
    }
}

// Funkce pro název státu (v angličtině)
function getCountryName(stat) {
    switch (stat) {
        case 'AUT': return 'Austria';
        case 'ITA': return 'Italy';
        case 'CHE': return 'Switzerland';
        case 'FRA': return 'France';
        case 'DEU': return 'Germany';
        case 'SVN': return 'Slovenia';
        default:    return 'Other';
    }
}

// Funkce pro formát data
function formatDate(isoDate) {
    if (!isoDate || isoDate === "") {
        return '---';
    }
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
}