/* ====================================
   IP Lookup - MULTIPLE FREE APIs + FALLBACK
   ==================================== */

let currentIPData = null;

async function performLookup() {
    const searchInput = document.getElementById('searchInput');
    const ip = searchInput?.value.trim();
    
    if (!ip || !isValidIP(ip)) {
        showNotification('Please enter a valid IP address (e.g., 8.8.8.8)', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // TRY API #1: ip-api.com (RELIABLE, FREE)
        let data = await tryIPAPI(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,orgName,query`);
        
        // TRY API #2: ipinfo.io (FREE tier)
        if (!data || data.status === 'fail') {
            data = await tryIPAPI(`https://ipinfo.io/${ip}/json`);
        }
        
        // TRY API #3: ipapi.co (backup)
        if (!data || data.error) {
            data = await tryIPAPI(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
        }
        
        if (!data || (data.status === 'fail' && data.message)) {
            throw new Error(data.message || 'Invalid IP address');
        }
        
        currentIPData = normalizeIPData(data);
        displayIPInfo(currentIPData);
        showResults();
        addToHistory(ip, 'IP');
        
    } catch (error) {
        console.error('IP Lookup Error:', error);
        showError(`IP lookup failed: ${error.message}`);
        showNotification('IP lookup unavailable - try WHOIS/DNS instead', 'warning');
    }
}

async function tryIPAPI(url) {
    try {
        const response = await axios.get(url, { timeout: 8000 });
        return response.data;
    } catch (error) {
        console.warn('IP API failed:', url, error.message);
        return null;
    }
}

function normalizeIPData(data) {
    return {
        ip: data.query || data.ip || data.ip_address,
        country_name: data.country || data.country_name,
        country_code: data.countryCode || data.country_code,
        region: data.regionName || data.region,
        city: data.city,
        postal: data.zip || data.postal,
        latitude: data.lat || data.latitude,
        longitude: data.lon || data.longitude,
        timezone: data.timezone,
        org: data.isp || data.org || data.organization,
        asn: data.as || data.asn?.asn || 'N/A',
        network: data.orgName || data.network || 'N/A'
    };
}

function isValidIP(ip) {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

function displayIPInfo(data) {
    const ipOverview = document.getElementById('ipOverview');
    if (ipOverview) {
        ipOverview.innerHTML = `
            ${createDataRow('IP Address', `<code class="font-mono">${data.ip}</code>`)}
            ${createDataRow('ASN', data.asn)}
            ${createDataRow('Network', data.network)}
        `;
    }
    
    const geolocation = document.getElementById('geolocation');
    if (geolocation) {
        geolocation.innerHTML = `
            ${createDataRow('Country', data.country_name || 'N/A')}
            ${createDataRow('Region', data.region || 'N/A')}
            ${createDataRow('City', data.city || 'N/A')}
            ${createDataRow('Coordinates', data.latitude && data.longitude ? `${data.latitude}, ${data.longitude}` : 'N/A')}
        `;
    }
    
    const networkInfo = document.getElementById('networkInfo');
    if (networkInfo) {
        networkInfo.innerHTML = `
            ${createDataRow('ISP/Organization', data.org || 'N/A')}
            ${createDataRow('Timezone', data.timezone || 'N/A')}
        `;
    }
    
    lucide.createIcons();
}
