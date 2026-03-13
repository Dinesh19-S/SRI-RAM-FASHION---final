const LOCALHOST_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

const getWindowSafe = () => (typeof window === 'undefined' ? null : window);

export const isElectronRuntime = () => {
    const win = getWindowSafe();
    if (!win) {
        return false;
    }

    const userAgent = (win.navigator?.userAgent || '').toLowerCase();
    return Boolean(win.electronAPI?.isElectron)
        || win.location.protocol === 'file:'
        || userAgent.includes('electron');
};

export const isGoogleLoginSecureOrigin = () => {
    const win = getWindowSafe();
    if (!win) {
        return false;
    }

    if (win.location.protocol === 'https:') {
        return true;
    }

    return LOCALHOST_HOSTS.has(win.location.hostname);
};

export const getGoogleLoginStatus = () => {
    const win = getWindowSafe();
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';
    const isElectron = isElectronRuntime();
    const isSecureOrigin = isGoogleLoginSecureOrigin();
    const origin = win?.location?.origin || '';

    if (!clientId) {
        return {
            enabled: false,
            reason: 'Google login is not configured. Set VITE_GOOGLE_CLIENT_ID in frontend .env.'
        };
    }

    if (isElectron) {
        return {
            enabled: false,
            reason: 'Google login is disabled inside the desktop app. Use email/password login.'
        };
    }

    if (!isSecureOrigin) {
        return {
            enabled: false,
            reason: `Google login requires HTTPS or localhost. Current origin: ${origin}`
        };
    }

    return {
        enabled: true,
        reason: ''
    };
};

export const getCurrentOrigin = () => {
    const win = getWindowSafe();
    return win?.location?.origin || 'unknown-origin';
};
