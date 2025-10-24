// API wrapper functions

async function apiCall(action, data = {}, method = 'POST') {
    const token = localStorage.getItem('auth_token');
    
    try {
        const url = method === 'GET' 
            ? `${API_URL}?action=${action}&${new URLSearchParams(data)}`
            : `${API_URL}?action=${action}`;
        
        const options = {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
            }
        };
        
        if (method === 'POST' && Object.keys(data).length > 0) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (result.error === 'unauthorized') {
            logout();
            return;
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Helper function for file upload
async function uploadFile(file, type) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const result = await apiCall('uploadFile', {
                    filename: file.name,
                    content: e.target.result,
                    type: type
                });
                resolve(result);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}