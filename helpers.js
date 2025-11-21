/* === HELPER FUNCTIONS === */

function getPeakColor(stat) {
    switch (stat) {
        case 'AUT': return '#e66e6e';
        case 'ITA': return '#74e66e';
        case 'CHE': return '#e66ec8';
        case 'FRA': return '#6ea7e6';
        case 'DEU': return '#000000';
        case 'SVN': return '#e6c36e';
        default:    return null;
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
        default:    return '🏳️';
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
        default:    return 'Other';
    }
}

function formatDate(isoDate) {
    if (!isoDate || isoDate === "") return '---';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}