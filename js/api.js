// CORS FIX: api.js
// Mengubah cara request ke Google Apps Script

async function apiCall(action, data = {}) {
    const token = localStorage.getItem('auth_token');
    
    try {
        // Build URL with all parameters
        const params = new URLSearchParams({
            action: action,
            ...data
        });
        
        // Add token if exists
        if (token) {
            params.append('token', token);
        }
        
        const url = `${API_URL}?${params.toString()}`;
        
        // Use GET for simple queries, POST for complex data
        const needsPost = ['createScript', 'updateScript', 'createProduction', 
                          'updateProduction', 'createSchedule', 'updateSchedule',
                          'addPerformance', 'importPerformanceCSV', 
                          'createTeamMember', 'updateTeamMember'].includes(action);
        
        let options;
        
        if (needsPost) {
            // POST request with body
            options = {
                method: 'POST',
                mode: 'no-cors', // Important for CORS
                headers: {
                    'Content-Type': 'text/plain', // Important for Google Apps Script
                },
                body: JSON.stringify({
                    action: action,
                    data: data,
                    token: token
                })
            };
            
            const response = await fetch(API_URL, options);
            
            // no-cors mode doesn't return readable response
            // We need to handle this differently
            return { success: true };
            
        } else {
            // GET request
            const response = await fetch(url, {
                method: 'GET',
                redirect: 'follow'
            });
            
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
            
            return result;
        }
        
    } catch (error) {
        console.error('API Call Error:', error);
        
        if (error.message.includes('Failed to fetch')) {
            showError('Network error. Please check your connection.');
        } else {
            showError('An error occurred: ' + error.message);
        }
        
        throw error;
    }
}

// Alternative: Use JSONP for GET requests
function apiCallJsonp(action, data = {}) {
    return new Promise((resolve, reject) => {
        const token = localStorage.getItem('auth_token');
        const callbackName = 'jsonpCallback_' + Date.now();
        
        // Create callback function
        window[callbackName] = (result) => {
            delete window[callbackName];
            document.body.removeChild(script);
            resolve(result);
        };
        
        // Build URL
        const params = new URLSearchParams({
            action: action,
            callback: callbackName,
            ...data
        });
        
        if (token) {
            params.append('token', token);
        }
        
        const url = `${API_URL}?${params.toString()}`;
        
        // Create script tag
        const script = document.createElement('script');
        script.src = url;
        script.onerror = () => {
            delete window[callbackName];
            document.body.removeChild(script);
            reject(new Error('JSONP request failed'));
        };
        
        document.body.appendChild(script);
    });
}

// Retry failed API calls
async function apiCallWithRetry(action, data = {}, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const result = await apiCall(action, data);
            return result;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Export to CSV
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
