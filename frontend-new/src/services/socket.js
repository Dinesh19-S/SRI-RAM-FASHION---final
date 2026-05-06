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
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

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

socket.on('connect', () => {
    console.log('[Socket] Connected to server:', socket.id);
});

socket.on('disconnect', () => {
    console.log('[Socket] Disconnected from server');
});

socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error);
});

export default socket;
