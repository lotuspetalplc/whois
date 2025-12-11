/* ====================================
   UI Utilities - Theme, Notifications, History
   ==================================== */

// Initialize Notyf for notifications
const notyf = new Notyf({
    duration: 3000,
    position: { x: 'right', y: 'top' },
    dismissible: true,
    ripple: true,
    types: [
        {
            type: 'success',
            background: '#10b981',
            icon: {
                className: 'notyf__icon--success',
                tagName: 'i'
            }
        },
        {
            type: 'error',
            background: '#ef4444',
            icon: {
                className: 'notyf__icon--error',
                tagName: 'i'
            }
        },
        {
            type: 'warning',
            background: '#f59e0b',
            icon: {
                className: 'notyf__icon--warning',
                tagName: 'i'
            }
        },
        {
            type: 'info',
            background: '#3b82f6',
            icon: {
                className: 'notyf__icon--info',
                tagName: 'i'
            }
        }
    ]
});

// ==================== Theme Management ====================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    showNotification(`Switched to ${newTheme} mode`, 'info');
}

function updateThemeIcon(theme) {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const icon = themeToggle.querySelector('i');
        if (icon) {
            icon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
            lucide.createIcons();
        }
    }
}

// ==================== Notifications ====================
function showNotification(message, type = 'info') {
    notyf.open({
        type: type,
        message: message
    });
}

// ==================== History Management ====================
function addToHistory(query, type) {
    let history = getHistory();
    
    // Add new entry
    const entry = {
        query: query,
        type: type,
        timestamp: new Date().toISOString()
    };
    
    // Remove duplicates
    history = history.filter(item => item.query !== query || item.type !== type);
    
    // Add to beginning
    history.unshift(entry);
    
    // Keep only last 20
    history = history.slice(0, 20);
    
    localStorage.setItem('searchHistory', JSON.stringify(history));
    updateHistoryCount();
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem('searchHistory') || '[]');
    } catch (e) {
        return [];
    }
}

function clearHistory() {
    localStorage.removeItem('searchHistory');
    updateHistoryCount();
    showNotification('History cleared', 'success');
    closeHistoryModal();
    
    // Reload history if on home page
    const historySection = document.getElementById('historySection');
    if (historySection) {
        historySection.classList.add('hidden');
    }
}

function updateHistoryCount() {
    const historyCount = document.getElementById('historyCount');
    if (historyCount) {
        const count = getHistory().length;
        historyCount.textContent = count;
        historyCount.style.display = count > 0 ? 'flex' : 'none';
    }
}

function loadHistory() {
    const history = getHistory();
    const historySection = document.getElementById('historySection');
    const historyList = document.getElementById('historyList');
    
    if (!historyList) return;
    
    if (history.length === 0) {
        if (historySection) historySection.classList.add('hidden');
        return;
    }
    
    if (historySection) historySection.classList.remove('hidden');
    
    historyList.innerHTML = history.slice(0, 5).map(item => {
        const date = new Date(item.timestamp);
        const timeAgo = getTimeAgo(date);
        const icon = getTypeIcon(item.type);
        
        return `
            <div class="history-item" onclick="navigateToHistory('${item.query}', '${item.type}')">
                <div class="flex items-center gap-3">
                    <i data-lucide="${icon}" class="w-5 h-5 text-blue-400"></i>
                    <div>
                        <div class="font-semibold">${escapeHtml(item.query)}</div>
                        <div class="text-sm text-gray-400">${item.type} • ${timeAgo}</div>
                    </div>
                </div>
                <i data-lucide="chevron-right" class="w-5 h-5 text-gray-500"></i>
            </div>
        `;
    }).join('');
    
    lucide.createIcons();
    updateHistoryCount();
}

function navigateToHistory(query, type) {
    const pages = {
        'WHOIS': 'whois.html',
        'DNS': 'dns.html',
        'IP': 'ip.html',
        'SSL': 'ssl.html',
        'Subdomains': 'subdomains.html'
    };
    
    const page = pages[type] || 'whois.html';
    window.location.href = `${page}?q=${encodeURIComponent(query)}`;
}

function getTypeIcon(type) {
    const icons = {
        'WHOIS': 'file-text',
        'DNS': 'server',
        'IP': 'map-pin',
        'SSL': 'lock',
        'Subdomains': 'git-branch'
    };
    return icons[type] || 'search';
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
    return date.toLocaleDateString();
}

// ==================== History Modal ====================
function showHistoryModal() {
    const modal = document.getElementById('historyModal');
    const modalContent = document.getElementById('historyModalContent');
    const history = getHistory();
    
    if (!modal || !modalContent) return;
    
    if (history.length === 0) {
        modalContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔍</div>
                <div class="empty-state-text">No search history yet</div>
            </div>
        `;
    } else {
        modalContent.innerHTML = history.map(item => {
            const date = new Date(item.timestamp);
            const timeAgo = getTimeAgo(date);
            const icon = getTypeIcon(item.type);
            
            return `
                <div class="history-item" onclick="navigateToHistory('${item.query}', '${item.type}')">
                    <div class="flex items-center gap-3">
                        <i data-lucide="${icon}" class="w-5 h-5 text-blue-400"></i>
                        <div>
                            <div class="font-semibold">${escapeHtml(item.query)}</div>
                            <div class="text-sm text-gray-400">${item.type} • ${timeAgo}</div>
                        </div>
                    </div>
                    <i data-lucide="chevron-right" class="w-5 h-5 text-gray-500"></i>
                </div>
            `;
        }).join('');
    }
    
    modal.classList.remove('hidden');
    lucide.createIcons();
}

function closeHistoryModal() {
    const modal = document.getElementById('historyModal');
    if (modal) modal.classList.add('hidden');
}

// ==================== Utility Functions ====================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

function showLoading() {
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    
    if (loading) loading.classList.remove('hidden');
    if (results) results.classList.add('hidden');
    if (error) error.classList.add('hidden');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
}

function showError(message) {
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    
    if (loading) loading.classList.add('hidden');
    if (results) results.classList.add('hidden');
    if (error) error.classList.remove('hidden');
    if (errorMessage) errorMessage.textContent = message;
    
    lucide.createIcons();
}

function showResults() {
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    const error = document.getElementById('error');
    
    if (loading) loading.classList.add('hidden');
    if (results) results.classList.remove('hidden');
    if (error) error.classList.add('hidden');
    
    lucide.createIcons();
}

function createDataRow(label, value, link = false) {
    if (!value || value === 'N/A' || value === '') {
        value = 'Not available';
    }
    
    const valueHtml = link ? 
        `<a href="${value}" target="_blank" class="data-value-link">${escapeHtml(value)}</a>` :
        `<span class="data-value">${escapeHtml(value)}</span>`;
    
    return `
        <div class="data-row">
            <div class="data-label">${label}</div>
            ${valueHtml}
        </div>
    `;
}

// ==================== Initialize ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initTheme();
    
    // Theme toggle
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // History button
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
        historyBtn.addEventListener('click', showHistoryModal);
    }
    
    // Update history count
    updateHistoryCount();
    
    // Close modal on backdrop click
    const historyModal = document.getElementById('historyModal');
    if (historyModal) {
        historyModal.addEventListener('click', (e) => {
            if (e.target === historyModal) {
                closeHistoryModal();
            }
        });
    }
});
