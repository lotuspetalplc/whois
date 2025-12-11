/* ====================================
   WHOIS Lookup - MULTIPLE FREE APIs
   ==================================== */

let currentWhoisData = null;

async function performLookup() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput?.value.trim();
    
    if (!query) {
        showNotification('Please enter a domain or IP address', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // TRY API #1: whoisjson.com (FREE, no key)
        let data = await tryWhoisAPI(`https://api.whoisjson.com/v1/${encodeURIComponent(query)}`);
        
        // TRY API #2: whoxy.com (FREE tier)
        if (!data || data.error) {
            data = await tryWhoisAPI(`https://api.whoapi.com/?r=whois&domain=${encodeURIComponent(query)}`);
        }
        
        // TRY API #3: whois.freemypc.com (backup)
        if (!data || data.error) {
            data = await tryWhoisAPI(`https://api.whois.freemypc.com/v1/${encodeURIComponent(query)}`);
        }
        
        if (!data || data.error || Object.keys(data).length === 0) {
            throw new Error('No WHOIS data available from free APIs');
        }
        
        parseAndDisplayWhois(query, data);
        currentWhoisData = { query, raw: JSON.stringify(data, null, 2) };
        showResults();
        addToHistory(query, 'WHOIS');
        
    } catch (error) {
        console.error('WHOIS Error:', error);
        showError(`WHOIS lookup unavailable: ${error.message}`);
        showNotification('WHOIS temporarily unavailable - try DNS/IP instead', 'warning');
    }
}

async function tryWhoisAPI(url) {
    try {
        const response = await axios.get(url, { timeout: 8000 });
        return response.data;
    } catch (error) {
        console.warn('API failed:', url, error.message);
        return null;
    }
}

function parseAndDisplayWhois(domain, data) {
    // Handle different API response formats
    let parsedData = {};
    
    if (typeof data === 'string') {
        // Raw text format
        const lines = data.split('\n');
        lines.forEach(line => {
            const match = line.match(/^([^:]+):\s*(.+)$/);
            if (match) {
                parsedData[match[1].trim().toLowerCase()] = match[2].trim();
            }
        });
    } else {
        // JSON format - flatten nested objects
        Object.keys(data).forEach(key => {
            if (typeof data[key] === 'string') {
                parsedData[key.toLowerCase()] = data[key];
            } else if (data[key]) {
                parsedData[key.toLowerCase()] = JSON.stringify(data[key]);
            }
        });
    }
    
    // Domain Overview
    const domainOverview = document.getElementById('domainOverview');
    if (domainOverview) {
        domainOverview.innerHTML = `
            ${createDataRow('Domain Name', domain)}
            ${createDataRow('Status', parsedData['status'] || parsedData['domainstatus'] || 'Active')}
            ${createDataRow('Registrar', parsedData['registrar'] || parsedData['registrarname'] || 'N/A')}
            ${createDataRow('Nameservers', getNameservers(parsedData))}
        `;
    }
    
    // Registrar Info
    const registrarInfo = document.getElementById('registrarInfo');
    if (registrarInfo) {
        registrarInfo.innerHTML = `
            ${createDataRow('Registrar', parsedData['registrar'] || parsedData['registrarname'] || 'N/A')}
            ${createDataRow('Registrar URL', parsedData['registrarurl'] || 'N/A', true)}
            ${createDataRow('WHOIS Server', parsedData['whois'] || parsedData['whoisserver'] || 'N/A')}
            ${createDataRow('Created', formatDate(parsedData['created'] || parsedData['createddate']))}
        `;
    }
    
    // Dates
    const datesInfo = document.getElementById('datesInfo');
    if (datesInfo) {
        datesInfo.innerHTML = `
            ${createDataRow('Created', formatDate(parsedData['created'] || parsedData['createddate']))}
            ${createDataRow('Updated', formatDate(parsedData['updated'] || parsedData['updateddate']))}
            ${createDataRow('Expires', formatDate(parsedData['expires'] || parsedData['expirationdate']))}
        `;
    }
    
    // Nameservers
    const nameservers = document.getElementById('nameservers');
    if (nameservers) {
        const nsList = getNameservers(parsedData);
        if (nsList.length > 0) {
            nameservers.innerHTML = nsList.map(ns => `
                <div class="bg-gray-900 px-4 py-3 rounded-lg border border-gray-700 flex items-center gap-2">
                    <i data-lucide="server" class="w-4 h-4 text-blue-400"></i>
                    <span class="font-mono text-sm">${escapeHtml(ns)}</span>
                </div>
            `).join('');
        } else {
            nameservers.innerHTML = '<p class="text-gray-400 italic">Nameservers not found in WHOIS data</p>';
        }
    }
    
    // Raw Data
    const rawWhois = document.getElementById('rawWhois');
    if (rawWhois) {
        rawWhois.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }
    
    lucide.createIcons();
}

function getNameservers(data) {
    const nsKeys = ['nameserver', 'ns', 'nserver'];
    const nsList = [];
    
    nsKeys.forEach(key => {
        if (data[key]) {
            if (Array.isArray(data[key])) {
                data[key].forEach(ns => nsList.push(ns));
            } else {
                nsList.push(data[key]);
            }
        }
    });
    
    return [...new Set(nsList.filter(ns => ns && ns.trim()))];
}

function formatDate(dateStr) {
    if (!dateStr || dateStr === 'N/A') return 'Not available';
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
    } catch {
        return dateStr;
    }
}

// Keep existing export functions unchanged...
