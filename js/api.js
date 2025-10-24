// REVISI LENGKAP: api.js
// Memperbaiki error handling dan menambahkan retry logic

async function apiCall(action, data = {}, method = 'POST') {
    const token = localStorage.getItem('auth_token');
    
    try {
        const url = method === 'GET' 
            ? `${API_URL}?action=${action}&${new URLSearchParams(data)}`
            : `${API_URL}?action=${action}`;
        
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (method === 'POST' && Object.keys(data).length > 0) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        
        // Check if response is ok
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Handle unauthorized
        if (result.error === 'unauthorized') {
            showError('Session expired. Please login again.');
            setTimeout(() => logout(), 2000);
            return null;
        }
        
        // Handle other errors
        if (result.error && result.error !== 'unauthorized') {
            console.error('API Error:', result);
        }
        
        return result;
        
    } catch (error) {
        console.error('API Call Error:', error);
        
        // Network error handling
        if (error.message.includes('Failed to fetch')) {
            showError('Network error. Please check your connection.');
        } else {
            showError('An error occurred: ' + error.message);
        }
        
        throw error;
    }
}

// Retry failed API calls
async function apiCallWithRetry(action, data = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await apiCall(action, data);
            return result;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            // Wait before retry (exponential backoff)
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Batch API calls
async function batchApiCall(calls) {
    const results = await Promise.allSettled(
        calls.map(call => apiCall(call.action, call.data))
    );
    
    return results.map((result, index) => ({
        action: calls[index].action,
        success: result.status === 'fulfilled',
        data: result.status === 'fulfilled' ? result.value : null,
        error: result.status === 'rejected' ? result.reason : null
    }));
}

// Upload file helper
async function uploadFile(file, type) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const result = await apiCall('uploadFile', {
                    filename: file.name,
                    content: e.target.result,
                    type: type,
                    size: file.size,
                    mimeType: file.type
                });
                resolve(result);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            reject(new Error('File size must be less than 10MB'));
            return;
        }
        
        reader.readAsDataURL(file);
    });
}

// Check API health
async function checkApiHealth() {
    try {
        const response = await fetch(API_URL);
        const result = await response.json();
        return result.status === 'ok';
    } catch (error) {
        console.error('API Health Check Failed:', error);
        return false;
    }
}

// Export data to CSV
function exportToCSV(data, filename) {
    if (!data || data.length === 0) {
        showError('No data to export');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// Import CSV
function importCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split('\n');
            const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            
            const data = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                
                const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
                const row = {};
                
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                
                data.push(row);
            }
            
            resolve({ headers, data });
        };
        
        reader.onerror = () => reject(new Error('Failed to read CSV file'));
        reader.readAsText(file);
    });
}
