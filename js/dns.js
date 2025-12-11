/* ====================================
   DNS Lookup Module - Cloudflare DOH
   ==================================== */

let currentDNSData = {};
let currentDomain = '';

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
    const domain = searchInput?.value.trim();
    
    if (!domain) {
        showNotification('Please enter a domain name', 'error');
        return;
    }
    
    currentDomain = domain;
    showLoading();
    
    try {
        // Fetch all DNS record types
        const recordTypes = ['A', 'AAAA', 'MX', 'TXT', 'CNAME', 'NS', 'SOA'];
        const promises = recordTypes.map(type => fetchDNSRecords(domain, type));
        
        const results = await Promise.all(promises);
        
        recordTypes.forEach((type, index) => {
            currentDNSData[type] = results[index];
        });
        
        displayDNSResults();
        showResults();
        
        // Show tabs
        const recordTabs = document.getElementById('recordTabs');
        if (recordTabs) {
            recordTabs.classList.remove('hidden');
        }
        
        // Show first record type by default
        showRecordType('A');
        
    } catch (error) {
        console.error('DNS Error:', error);
        showError('Failed to fetch DNS records. Please check the domain and try again.');
        showNotification('DNS lookup failed', 'error');
    }
}

async function fetchDNSRecords(domain, type) {
    try {
        const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`;
        const response = await axios.get(url, {
            headers: {
                'Accept': 'application/dns-json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${type} records:`, error);
        return { Answer: [] };
    }
}

function displayDNSResults() {
    const resultsContainer = document.getElementById('results');
    if (!resultsContainer) return;
    
    let html = '';
    
    Object.keys(currentDNSData).forEach(type => {
        const data = currentDNSData[type];
        const records = data.Answer || [];
        
        html += `
            <div id="record-${type}" class="record-section hidden">
                <div class="bg-gray-800 rounded-xl p-6 border border-gray-700">
                    <h2 class="text-2xl font-bold mb-4 flex items-center gap-2">
                        <i data-lucide="database" class="w-6 h-6 text-blue-400"></i>
                        ${type} Records
                        <span class="text-sm text-gray-400">(${records.length} found)</span>
                    </h2>
                    
                    ${records.length === 0 ? 
                        `<div class="empty-state">
                            <div class="empty-state-icon">📭</div>
                            <div class="empty-state-text">No ${type} records found</div>
                        </div>` :
                        `<div class="space-y-3">
                            ${records.map(record => renderDNSRecord(record, type)).join('')}
                        </div>`
                    }
                </div>
            </div>
        `;
    });
    
    resultsContainer.innerHTML = html;
    lucide.createIcons();
}

function renderDNSRecord(record, type) {
    let content = '';
    
    switch(type) {
        case 'A':
        case 'AAAA':
            content = `
                ${createDataRow('Name', record.name)}
                ${createDataRow('IP Address', record.data)}
                ${createDataRow('TTL', `${record.TTL} seconds`)}
            `;
            break;
            
        case 'MX':
            const mxData = record.data.split(' ');
            content = `
                ${createDataRow('Name', record.name)}
                ${createDataRow('Mail Server', mxData[1] || record.data)}
                ${createDataRow('Priority', mxData[0] || 'N/A')}
                ${createDataRow('TTL', `${record.TTL} seconds`)}
            `;
            break;
            
        case 'TXT':
            content = `
                ${createDataRow('Name', record.name)}
                ${createDataRow('Text', record.data)}
                ${createDataRow('TTL', `${record.TTL} seconds`)}
            `;
            break;
            
        case 'CNAME':
            content = `
                ${createDataRow('Name', record.name)}
                ${createDataRow('Target', record.data)}
                ${createDataRow('TTL', `${record.TTL} seconds`)}
            `;
            break;
            
        case 'NS':
            content = `
                ${createDataRow('Name', record.name)}
                ${createDataRow('Nameserver', record.data)}
                ${createDataRow('TTL', `${record.TTL} seconds`)}
            `;
            break;
            
        case 'SOA':
            const soaParts = record.data.split(' ');
            content = `
                ${createDataRow('Primary NS', soaParts[0] || 'N/A')}
                ${createDataRow('Admin Email', soaParts[1] || 'N/A')}
                ${createDataRow('Serial', soaParts[2] || 'N/A')}
                ${createDataRow('Refresh', soaParts[3] || 'N/A')}
                ${createDataRow('Retry', soaParts[4] || 'N/A')}
                ${createDataRow('Expire', soaParts[5] || 'N/A')}
                ${createDataRow('Minimum TTL', soaParts[6] || 'N/A')}
            `;
            break;
            
        default:
            content = `
                ${createDataRow('Name', record.name)}
                ${createDataRow('Data', record.data)}
                ${createDataRow('TTL', `${record.TTL} seconds`)}
            `;
    }
    
    return `
        <div class="dns-card grid md:grid-cols-2 gap-4">
            ${content}
        </div>
    `;
}

function showRecordType(type) {
    // Hide all sections
    document.querySelectorAll('.record-section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show selected section
    const selectedSection = document.getElementById(`record-${type}`);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
    }
    
    // Update tab active state
    document.querySelectorAll('.record-tab').forEach(tab => {
        tab.classList.remove('active', 'bg-gradient-to-r', 'from-purple-600', 'to-blue-600');
        tab.classList.add('bg-gray-700');
    });
    
    const activeTab = document.querySelector(`.record-tab[data-type="${type}"]`);
    if (activeTab) {
        activeTab.classList.remove('bg-gray-700');
        activeTab.classList.add('active', 'bg-gradient-to-r', 'from-purple-600', 'to-blue-600');
    }
    
    lucide.createIcons();
}
