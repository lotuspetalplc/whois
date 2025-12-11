/* ====================================
   WHOIS Lookup Module
   ==================================== */

let currentWhoisData = null;

// Perform WHOIS lookup on page load
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
    const query = searchInput?.value.trim();
    
    if (!query) {
        showNotification('Please enter a domain or IP address', 'error');
        return;
    }
    
    showLoading();
    
    try {
        // Try HackerTarget API first (no API key required for limited requests)
        const response = await axios.get(`https://api.hackertarget.com/whois/?q=${encodeURIComponent(query)}`);
        
        if (response.data.includes('error check your search parameter')) {
            throw new Error('Invalid domain or IP address');
        }
        
        if (response.data.includes('API count exceeded')) {
            // Fallback to alternative method
            showNotification('API limit reached, showing limited data', 'warning');
            displayLimitedWhoisData(query, response.data);
        } else {
            parseAndDisplayWhois(query, response.data);
        }
        
        currentWhoisData = { query, raw: response.data };
        showResults();
        
    } catch (error) {
        console.error('WHOIS Error:', error);
        showError('Failed to fetch WHOIS data. Please try again or check if the domain is valid.');
        showNotification('WHOIS lookup failed', 'error');
    }
}

function parseAndDisplayWhois(domain, rawData) {
    const lines = rawData.split('\n');
    const data = {};
    
    // Parse common WHOIS fields
    lines.forEach(line => {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
            const key = match[1].trim().toLowerCase();
            const value = match[2].trim();
            
            if (!data[key]) {
                data[key] = value;
            }
        }
    });
    
    // Display Domain Overview
    const domainOverview = document.getElementById('domainOverview');
    if (domainOverview) {
        domainOverview.innerHTML = `
            ${createDataRow('Domain Name', domain)}
            ${createDataRow('Status', data['domain status'] || data['status'] || 'Active')}
            ${createDataRow('DNSSEC', data['dnssec'] || 'Unsigned')}
            ${createDataRow('Domain Age', calculateDomainAge(data['creation date'] || data['created']))}
        `;
    }
    
    // Display Registrar Info
    const registrarInfo = document.getElementById('registrarInfo');
    if (registrarInfo) {
        registrarInfo.innerHTML = `
            ${createDataRow('Registrar', data['registrar'] || data['registrar name'] || 'N/A')}
            ${createDataRow('Registrar URL', data['registrar url'] || 'N/A', true)}
            ${createDataRow('Registrar WHOIS', data['registrar whois server'] || data['whois server'] || 'N/A')}
            ${createDataRow('Registrar IANA ID', data['registrar iana id'] || 'N/A')}
        `;
    }
    
    // Display Dates
    const datesInfo = document.getElementById('datesInfo');
    if (datesInfo) {
        datesInfo.innerHTML = `
            ${createDataRow('Created Date', formatDate(data['creation date'] || data['created']))}
            ${createDataRow('Updated Date', formatDate(data['updated date'] || data['last modified'] || data['modified']))}
            ${createDataRow('Expiry Date', formatDate(data['registry expiry date'] || data['expiration date'] || data['expires']))}
        `;
    }
    
    // Display Nameservers
    const nameservers = document.getElementById('nameservers');
    if (nameservers) {
        const nsList = [];
        lines.forEach(line => {
            if (line.toLowerCase().includes('name server:') || line.toLowerCase().includes('nameserver:')) {
                const ns = line.split(':')[1]?.trim();
                if (ns && !nsList.includes(ns)) {
                    nsList.push(ns);
                }
            }
        });
        
        if (nsList.length > 0) {
            nameservers.innerHTML = nsList.map(ns => `
                <div class="bg-gray-900 px-4 py-3 rounded-lg border border-gray-700 flex items-center gap-2">
                    <i data-lucide="server" class="w-4 h-4 text-blue-400"></i>
                    <span class="font-mono text-sm">${escapeHtml(ns)}</span>
                </div>
            `).join('');
        } else {
            nameservers.innerHTML = '<p class="text-gray-400">No nameservers found</p>';
        }
    }
    
    // Display Raw WHOIS
    const rawWhois = document.getElementById('rawWhois');
    if (rawWhois) {
        rawWhois.textContent = rawData;
    }
    
    lucide.createIcons();
}

function displayLimitedWhoisData(domain, rawData) {
    const domainOverview = document.getElementById('domainOverview');
    if (domainOverview) {
        domainOverview.innerHTML = `
            ${createDataRow('Domain Name', domain)}
            ${createDataRow('Status', 'Active')}
        `;
    }
    
    const rawWhois = document.getElementById('rawWhois');
    if (rawWhois) {
        rawWhois.textContent = rawData;
    }
}

function calculateDomainAge(creationDate) {
    if (!creationDate) return 'N/A';
    
    try {
        const created = new Date(creationDate);
        const now = new Date();
        const years = now.getFullYear() - created.getFullYear();
        const months = now.getMonth() - created.getMonth();
        
        if (years === 0) {
            return `${months} months`;
        } else if (months < 0) {
            return `${years - 1} years, ${12 + months} months`;
        } else {
            return `${years} years, ${months} months`;
        }
    } catch (e) {
        return 'N/A';
    }
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    } catch (e) {
        return dateString;
    }
}

function exportJSON() {
    if (!currentWhoisData) return;
    
    const dataStr = JSON.stringify(currentWhoisData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `whois-${currentWhoisData.query}-${Date.now()}.json`;
    link.click();
    
    showNotification('JSON exported successfully', 'success');
}

function exportPDF() {
    if (!currentWhoisData) return;
    
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.text('WHOIS Lookup Report', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Domain: ${currentWhoisData.query}`, 20, 35);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 45);
        
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(currentWhoisData.raw, 170);
        doc.text(lines, 20, 60);
        
        doc.save(`whois-${currentWhoisData.query}-${Date.now()}.pdf`);
        showNotification('PDF exported successfully', 'success');
    } catch (error) {
        showNotification('PDF export failed', 'error');
    }
}

function copyToClipboard() {
    if (!currentWhoisData) return;
    
    navigator.clipboard.writeText(currentWhoisData.raw).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}
