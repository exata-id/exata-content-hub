// Configuration file
const API_URL = 'https://script.google.com/macros/s/AKfycbyVLwLpNZBshqc7Us8XVNsOV-p3pXBOTZgxQgj7-aGcFy7_AxqZFcypu_Af6JO8mFfN/exec';

// API Endpoints
const ENDPOINTS = {
    auth: {
        sendCode: 'sendVerificationCode',
        verify: 'verifyCode',
        logout: 'logout'
    },
    dashboard: {
        stats: 'getDashboardStats'
    },
    scripts: {
        list: 'getScripts',
        create: 'createScript',
        update: 'updateScript',
        delete: 'deleteScript',
        approve: 'approveScript'
    },
    production: {
        list: 'getProduction',
        create: 'createProduction',
        update: 'updateProduction'
    },
    scheduling: {
        list: 'getSchedules',
        create: 'createSchedule',
        update: 'updateSchedule',
        delete: 'deleteSchedule'
    },
    analytics: {
        performance: 'getPerformance',
        addPerformance: 'addPerformance',
        importCSV: 'importPerformanceCSV'
    },
    team: {
        list: 'getTeamMembers',
        create: 'createTeamMember',
        update: 'updateTeamMember',
        delete: 'deleteTeamMember'
    },
    notifications: {
        list: 'getNotifications',
        markRead: 'markNotificationRead'
    }
};

// Role permissions
const ROLES = {
    admin: ['all'],
    manager: ['scripts', 'production', 'scheduling', 'analytics', 'team'],
    creator: ['scripts', 'production', 'scheduling'],
    editor: ['production', 'scheduling'],
    viewer: ['analytics']
};

// Status colors
const STATUS_COLORS = {
    draft: 'gray',
    pending: 'yellow',
    approved: 'green',
    revision: 'red',
    in_progress: 'blue',
    completed: 'green',
    scheduled: 'purple',
    posted: 'green'
};