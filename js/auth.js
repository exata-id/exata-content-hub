// Authentication utilities

function checkAuth() {
    const token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    
    if (!token || !userData) {
        window.location.href = 'login.html';
        return false;
    }
    
    return true;
}

function logout() {
    Swal.fire({
        title: 'Logout?',
        text: 'Anda yakin ingin keluar?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Ya, Logout',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_data');
            window.location.href = 'login.html';
        }
    });
}

function getUserData() {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
}

function hasPermission(module) {
    const user = getUserData();
    if (!user) return false;
    
    const rolePermissions = ROLES[user.role] || [];
    return rolePermissions.includes('all') || rolePermissions.includes(module);
}