import { io } from 'socket.io-client';

const getSocketUrl = () => {
    // Match the logic in api.js for determining the base URL
    const explicitUrl = import.meta.env.VITE_API_URL?.trim();
    if (explicitUrl) {
        // Remove /api/v1 from the end if present, as socket.io connects to the root usually
        return explicitUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
    }

    const isLocalHost = typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname === '::1');

    if (typeof window !== 'undefined' && !isLocalHost) {
        return window.location.origin;
    }

    return 'http://localhost:5000';
};

const SOCKET_URL = getSocketUrl();

export const socket = io(SOCKET_URL, {
    path: '/socket.io',
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,  // ✅ Keep trying indefinitely
    reconnectionDelay: 1000,         // ✅ Start with 1 second delay
    reconnectionDelayMax: 30000,     // ✅ Max 30 seconds between attempts
    randomizationFactor: 0.5,        // ✅ Add randomization to prevent thundering herd
    transports: ['websocket', 'polling'],  // ✅ Prefer websocket
    upgrade: true,
    rememberUpgrade: true,
    forceNew: false,
    timeout: 60000,
    query: {}
});

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
