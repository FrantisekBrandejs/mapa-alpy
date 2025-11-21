/* === HELPER FUNCTIONS === */

function getPeakColor(stat) {
    switch (stat) {
        case 'AUT': return '#FD6D5D';
        case 'ITA': return '#6bb36dff';
        case 'CHE': return '#d66fb0ff';
        case 'FRA': return '#6aa0f0ff';
        case 'DEU': return '#fae94dff';
        case 'SVN': return '#b1f82eff';
        default:    return null;
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