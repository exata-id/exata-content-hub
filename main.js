// --- CONFIGURATION ---
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwRS5X4PFVj3r3KWA9sI3xByNjJA9CgXuRpBoXn46JCvJRSPE54yIIjH1gW5Qfz6EQ/exec'; // Ganti dengan URL Web App Anda
let userProfile = null; // To store user's profile info

// --- API HELPER ---
async function api(action, payload = {}, method = 'GET') {
    const url = new URL(SCRIPT_URL);
    if (method === 'GET') {
        url.searchParams.append('action', action);
        for (const key in payload) {
            url.searchParams.append(key, payload[key]);
        }
    }
    
    const idToken = sessionStorage.getItem('id_token');
    if (!idToken) {
        console.error("User not authenticated.");
        showAuthScreen();
        return;
    }

    const headers = { 'Content-Type': 'application/json' };
    const body = method === 'POST' ? JSON.stringify({ action, idToken, payload }) : null;
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: headers,
            body: body,
            redirect: 'follow'
        });

        if (response.ok) {
            const result = await response.json();
            if (result.status === 'success') {
                return result.data;
            } else {
                throw new Error(result.message || 'API error');
            }
        } else {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
    } catch (error) {
        console.error('API call failed:', error);
        // Optionally show an error message to the user
        return null;
    }
}


// --- AUTHENTICATION ---
function handleCredentialResponse(response) {
    sessionStorage.setItem('id_token', response.credential);
    api('verifyUser', {}, 'POST')
        .then(data => {
            if (data && data.user) {
                userProfile = data.user;
                sessionStorage.setItem('user_profile', JSON.stringify(userProfile));
                initializeApp();
            } else {
                alert('Authentication failed or user not found in the system.');
                showAuthScreen();
            }
        });
}

function showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app-screen').style.display = 'none';
    sessionStorage.clear();
}

function showAppScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
}

function logout() {
    google.accounts.id.disableAutoSelect();
    showAuthScreen();
}

// --- INITIALIZATION ---
function initializeApp() {
    showAppScreen();
    const user = JSON.parse(sessionStorage.getItem('user_profile'));
    document.getElementById('user-name').textContent = user.name;
    document.getElementById('user-email').textContent = user.email;
    document.getElementById('user-avatar').src = user.picture;

    setupEventListeners();
    navigateTo('dashboard');
}

// --- UI & RENDERING ---
function renderTasks(tasks) {
    const tableBody = document.getElementById('tasks-table-body');
    tableBody.innerHTML = '';
    if (!tasks || tasks.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="p-3 text-center text-gray-500">Tidak ada tugas ditemukan.</td></tr>';
        return;
    }
    tasks.forEach(task => {
        const row = `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 font-medium">${task.title}</td>
                <td class="p-3">${task.creatorEmail}</td>
                <td class="p-3">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">${task.status}</span>
                </td>
                <td class="p-3">${new Date(task.deadline).toLocaleDateString()}</td>
                <td class="p-3">
                    <button class="text-indigo-600 hover:underline">Detail</button>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

function renderDashboard(data) {
    document.getElementById('dashboard-active-tasks').textContent = data.stats.active || 0;
    document.getElementById('dashboard-pending-approval').textContent = data.stats.pending || 0;
    document.getElementById('dashboard-scheduled-posts').textContent = data.stats.scheduled || 0;

    const activityLog = document.getElementById('dashboard-activity-log');
    activityLog.innerHTML = '';
    data.activity.forEach(log => {
        const item = `
            <li class="flex items-center text-sm">
                <span class="font-semibold text-gray-800 mr-2">${log.userEmail}</span>
                <span class="text-gray-600">${log.action.replace(/_/g, ' ').toLowerCase()}</span>
                <span class="ml-auto text-gray-400">${new Date(log.timestamp).toLocaleString()}</span>
            </li>
        `;
        activityLog.insertAdjacentHTML('beforeend', item);
    });
}

function renderAnalytics(performanceData) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    const labels = performanceData.map(p => p.taskId); // Simple label, could be task title
    const viewsData = performanceData.map(p => p.views);
    const likesData = performanceData.map(p => p.likes);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Views',
                    data: viewsData,
                    backgroundColor: 'rgba(79, 70, 229, 0.8)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Likes',
                    data: likesData,
                    backgroundColor: 'rgba(251, 146, 60, 0.8)',
                    borderColor: 'rgba(251, 146, 60, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Performa Konten'
                }
            }
        }
    });
}


// --- NAVIGATION & PAGE LOADING ---
function navigateTo(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');

    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.querySelector(`.sidebar-link[data-view="${viewName}"]`).classList.add('active');

    loadViewData(viewName);
}

function loadViewData(viewName) {
    switch (viewName) {
        case 'dashboard':
            api('getDashboardData').then(renderDashboard);
            break;
        case 'tasks':
            api('getTasks').then(renderTasks);
            break;
        case 'analytics':
            api('getPerformanceData').then(renderAnalytics);
            break;
    }
}


// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(e.target.dataset.view);
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', logout);
    
    // Task modal
    const taskModal = document.getElementById('task-modal');
    document.getElementById('add-task-btn').addEventListener('click', () => taskModal.style.display = 'flex');
    document.getElementById('cancel-task-btn').addEventListener('click', () => taskModal.style.display = 'none');
    
    // Task form submission
    document.getElementById('task-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const task = {
            title: document.getElementById('task-title').value,
            type: document.getElementById('task-type').value,
            deadline: document.getElementById('task-deadline').value
        };

        api('createTask', task, 'POST').then(result => {
            if(result) {
                alert('Tugas berhasil dibuat!');
                taskModal.style.display = 'none';
                document.getElementById('task-form').reset();
                navigateTo('tasks'); // Refresh the task list
            }
        });
    });
}


// --- ON-LOAD ---
window.onload = function() {
    const token = sessionStorage.getItem('id_token');
    if (token) {
        initializeApp();
    } else {
        showAuthScreen();
    }
};
