/* ====================================
   IP Lookup Module
   ==================================== */

let currentIPData = null;

document.addEventListener('DOMContentLoaded', () => {
    const query = getQueryParam('q');
    const searchInput = document.getElementById('searchInput');
    
    if (searchInput && query) {
        searchInput.value = query;
        performLookup();
    }
});

async function performLookup() {
    const searchInput = document.getElementById('searchInput');
    const ip = searchInput?.value.trim();
    
    if (!ip) {
        showNotification('Please enter an IP address', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // Using ipapi.co free API (no key required)
        const response = await axios.get(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
        
        if (response.data.error) {
            throw new Error(response.data.reason || 'Invalid IP address');
        }
        
        currentIPData = response.data;
        displayIPInfo(response.data);
        showResults();
        
    } catch (error) {
        console.error('IP Lookup Error:', error);
        showError('Failed to fetch IP information. Please check the IP address and try again.');
        showNotification('IP lookup failed', 'error');
    }
}

function displayIPInfo(data) {
    // IP Overview
    const ipOverview = document.getElementById('ipOverview');
    if (ipOverview) {
        ipOverview.innerHTML = `
            ${createDataRow('IP Address', data.ip)}
            ${createDataRow('Version', data.version || 'IPv4')}
            ${createDataRow('Network', data.network || 'N/A')}
            ${createDataRow('ASN', data.asn || 'N/A')}
        `;
    }
    
    // Geolocation
    const geolocation = document.getElementById('geolocation');
    if (geolocation) {
        geolocation.innerHTML = `
            ${createDataRow('Country', `${data.country_name} (${data.country_code})`)}
            ${createDataRow('Region', data.region || 'N/A')}
            ${createDataRow('City', data.city || 'N/A')}
            ${createDataRow('Postal Code', data.postal || 'N/A')}
            ${createDataRow('Timezone', data.timezone || 'N/A')}
            ${createDataRow('Coordinates', data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : 'N/A')}
        `;
    }
    
    // Network Information
    const networkInfo = document.getElementById('networkInfo');
    if (networkInfo) {
        networkInfo.innerHTML = `
            ${createDataRow('Organization', data.org || 'N/A')}
            ${createDataRow('ISP', data.org || 'N/A')}
            ${createDataRow('Currency', data.currency ? `${data.currency} (${data.currency_name})` : 'N/A')}
            ${createDataRow('Languages', data.languages || 'N/A')}
        `;
    }
    
    lucide.createIcons();
}
