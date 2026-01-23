import { io } from 'socket.io-client';

// Socket.IO server URL (same as backend)
const SOCKET_URL = import.meta.env.DEV 
    ? 'http://localhost:3000' 
    : (import.meta.env.VITE_SOCKET_URL || window.location.origin);

let socket = null;

/**
 * Initialize and get the socket instance
 * @returns {Object} Socket.IO client instance
 */
export function getSocket() {
    if (!socket) {
        socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        socket.on('connect', () => {
            console.log('[Socket.IO] Connected:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket.IO] Disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('[Socket.IO] Connection error:', error.message);
        });
    }
    return socket;
}

/**
 * Join a paper room to receive updates
 * @param {string} paperId - Paper ID to subscribe to
 */
export function joinPaperRoom(paperId) {
    const sock = getSocket();
    sock.emit('join_paper', paperId);
    console.log(`[Socket.IO] Joining room: paper_${paperId}`);
}

/**
 * Leave a paper room
 * @param {string} paperId - Paper ID to unsubscribe from
 */
export function leavePaperRoom(paperId) {
    const sock = getSocket();
    sock.emit('leave_paper', paperId);
    console.log(`[Socket.IO] Leaving room: paper_${paperId}`);
}

/**
 * Subscribe to paper updates
 * @param {Function} callback - Callback function for updates
 * @returns {Function} Unsubscribe function
 */
export function onPaperUpdate(callback) {
    const sock = getSocket();
    sock.on('paper_updated', callback);
    
    // Return unsubscribe function
    return () => {
        sock.off('paper_updated', callback);
    };
}

/**
 * Subscribe to paper updates for a specific paper
 * @param {string} paperId - Paper ID to listen for
 * @param {Object} handlers - Event handlers { onStatusChange, onCompleted, onFailed }
 * @returns {Function} Cleanup function
 */
export function subscribeToPaper(paperId, handlers) {
    const { onStatusChange, onCompleted, onFailed } = handlers;
    
    // Join the room
    joinPaperRoom(paperId);
    
    // Handle updates
    const handleUpdate = (data) => {
        // Only process updates for this paper
        if (data.paperId !== paperId) return;
        
        console.log(`[Socket.IO] Paper update for ${paperId}:`, data.type);
        
        switch (data.type) {
            case 'status_change':
                onStatusChange?.(data.status, data);
                break;
            case 'generation_completed':
                onCompleted?.(data.paper, data);
                break;
            case 'generation_failed':
                onFailed?.(data.error, data);
                break;
            default:
                console.log('[Socket.IO] Unknown update type:', data.type);
        }
    };
    
    const unsubscribe = onPaperUpdate(handleUpdate);
    
    // Return cleanup function
    return () => {
        unsubscribe();
        leavePaperRoom(paperId);
    };
}

/**
 * Disconnect the socket
 */
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('[Socket.IO] Manually disconnected');
    }
}

export default {
    getSocket,
    joinPaperRoom,
    leavePaperRoom,
    onPaperUpdate,
    subscribeToPaper,
    disconnectSocket
};
