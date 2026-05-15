let io;

export const initSocket = (socketIo) => {
    io = socketIo;
    return io;
};

export const getIo = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

export const emitEvent = (event, data) => {
    if (io) {
        console.log(`[Socket] Emitting event: ${event}`);
        io.emit(event, data);
    }
};

export const emitToRoom = (room, event, data) => {
    if (io) {
        console.log(`[Socket] Emitting event: ${event} to room: ${room}`);
        io.to(room).emit(event, data);
    }
};

export default {
    initSocket,
    getIo,
    emitEvent,
    emitToRoom
};
