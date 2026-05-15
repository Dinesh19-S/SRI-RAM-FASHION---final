import { io } from 'socket.io-client';

const getSocketUrl = () => {
    // 1. Explicit environment variable always takes precedence
    const explicitUrl = import.meta.env.VITE_API_URL?.trim();
    if (explicitUrl) {
        // Clean up API path to get the base server URL
        return explicitUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
    }

    // 2. Detect environment
    const isLocalHost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname === '::1');

    const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:';

    // 3. Fallback logic
    if (typeof window !== 'undefined') {
        if (isFileProtocol) {
            // Electron/Capacitor environment - must use a remote URL or default localhost
            return 'http://localhost:5000'; // Default dev fallback
        }
        if (!isLocalHost) {
            // Production Website environment
            return window.location.origin;
        }
    }

    return 'http://localhost:5000'; // Standard localhost fallback
};

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
    path: '/socket.io',
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,  // ✅ Never stop trying to reconnect
    reconnectionDelay: 1000,         // ✅ Start with 1s delay
    reconnectionDelayMax: 5000,      // ✅ Max 5s delay between attempts
    randomizationFactor: 0.5,
    transports: ['websocket', 'polling'], // ✅ WebSocket first, fallback to polling
    upgrade: true,
    rememberUpgrade: true,
    timeout: 20000,                  // ✅ Connection timeout
    forceNew: false,
    rejectUnauthorized: false        // ✅ Allow self-signed certificates in development
});

// ✅ Maintain persistent connection with active monitoring
if (typeof window !== 'undefined') {
    // Reconnect on window focus (tab becomes active)
    window.addEventListener('focus', () => {
        if (!socket.connected) {
            console.log('[Socket] 🔄 Window focused, attempting reconnection...');
            socket.connect();
        }
    });
    
    // Periodic health check - ensure connection stays alive
    setInterval(() => {
        if (socket.connected) {
            socket.emit('ping', Date.now());
        }
    }, 30000); // Every 30 seconds
}


// Enhanced connection status tracking
let connectionAttempts = 0;
let lastConnectionTime = null;

// Helper to join rooms (e.g., for specific company or user)
export const joinRoom = (room) => {
    if (socket.connected) {
        socket.emit('join', room);
    } else {
        socket.once('connect', () => {
            socket.emit('join', room);
        });
    }
};

// ✅ Connection events with enhanced logging and monitoring
socket.on('connect', () => {
    console.log('[Socket] ✅ Connected to server:', socket.id);
    lastConnectionTime = Date.now();
    connectionAttempts = 0;  // Reset attempts on successful connection
});

socket.on('disconnect', (reason) => {
    console.warn('[Socket] ⚠️ Disconnected from server. Reason:', reason);
    if (reason === 'io server disconnect') {
        // Server disconnected the client, attempt reconnection
        socket.connect();
    }
});

socket.on('connect_error', (error) => {
    connectionAttempts++;
    console.error(`[Socket] ❌ Connection error (Attempt ${connectionAttempts}):`, error.message);
});

socket.on('reconnect_attempt', () => {
    connectionAttempts++;
    console.log(`[Socket] 🔄 Reconnection attempt #${connectionAttempts}...`);
});

socket.on('reconnect', () => {
    console.log('[Socket] ✅ Reconnected successfully after disconnection');
    connectionAttempts = 0;
});

socket.on('reconnect_error', (error) => {
    console.error('[Socket] ❌ Reconnection error:', error.message);
});

socket.on('reconnect_failed', () => {
    console.error('[Socket] ❌ Failed to reconnect. Retrying indefinitely...');
});

// ✅ Periodic health check to ensure connection stability
setInterval(() => {
    if (socket.connected) {
        socket.emit('ping', () => {
            // Pong received
        });
    }
}, 30000);  // Every 30 seconds

export default socket;
