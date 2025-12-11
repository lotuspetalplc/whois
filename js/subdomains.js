/* ====================================
   Subdomain Finder Module - crt.sh API
   ==================================== */

let currentSubdomains = [];

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
    let domain = searchInput?.value.trim();
    
    if (!domain) {
        showNotification('Please enter a domain name', 'error');
        return;
    }
    
    // Remove protocol and path
    domain = domain.replace(/^https?:\/\//, '').split('/')[0];
    
    showLoading();
    
    try {
        // Fetch from crt.sh Certificate Transparency logs
        const response = await axios.get(`https://crt.sh/?q=%.${encodeURIComponent(domain)}&output=json`);
        
        if (!response.data || response.data.length === 0) {
            throw new Error('No subdomains found');
        }
        
        // Extract unique subdomains
        const subdomains = new Set();
        response.data.forEach(cert => {
            if (cert.name_value) {
                cert.name_value.split('\n').forEach(name => {
                    const cleanName = name.trim().toLowerCase();
                    // Filter out wildcards and duplicates
                    if (!cleanName.startsWith('*') && cleanName.includes(domain)) {
                        subdomains.add(cleanName);
                    }
                });
            }
        });
        
        currentSubdomains = Array.from(subdomains).sort();
        displaySubdomains(domain, currentSubdomains);
        showResults();
        
    } catch (error) {
        console.error('Subdomain Discovery Error:', error);
        showError('Failed to discover subdomains. The domain may not have any subdomains in Certificate Transparency logs.');
        showNotification('Subdomain discovery failed', 'error');
    }
}

function displaySubdomains(domain, subdomains) {
    const subdomainCount = document.getElementById('subdomainCount');
    const subdomainList = document.getElementById('subdomainList');
    
    if (subdomainCount) {
        subdomainCount.textContent = `(${subdomains.length} found)`;
    }
    
    if (subdomainList) {
        if (subdomains.length === 0) {
            subdomainList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔍</div>
                    <div class="empty-state-text">No subdomains discovered for ${domain}</div>
                </div>
            `;
        } else {
            subdomainList.innerHTML = subdomains.map(subdomain => `
                <div class="subdomain-item">
                    <i data-lucide="external-link" class="w-4 h-4 text-blue-400 flex-shrink-0"></i>
                    <a href="https://${subdomain}" target="_blank" class="flex-1 text-blue-400 hover:text-blue-300 font-mono text-sm">
                        ${escapeHtml(subdomain)}
                    </a>
                    <button onclick="copySubdomain('${subdomain}')" class="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                        <i data-lucide="copy" class="w-4 h-4 text-gray-400"></i>
                    </button>
                </div>
            `).join('');
        }
    }
    
    lucide.createIcons();
}

function copySubdomain(subdomain) {
    navigator.clipboard.writeText(subdomain).then(() => {
        showNotification('Copied: ' + subdomain, 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}

function exportSubdomains() {
    if (currentSubdomains.length === 0) return;
    
    const dataStr = currentSubdomains.join('\n');
    const dataBlob = new Blob([dataStr], { type: 'text/plain' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `subdomains-${Date.now()}.txt`;
    link.click();
    
    showNotification(`Exported ${currentSubdomains.length} subdomains`, 'success');
}
