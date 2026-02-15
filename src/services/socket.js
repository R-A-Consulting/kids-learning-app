import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket = null;

// Reference-counted room membership so multiple subscribers don't break each other
const bankRoomRefs = {};
const paperRoomRefs = {};

export function getSocket() {
    if (!socket) {
        socket = io(SOCKET_URL, {
            withCredentials: true,
            autoConnect: true,
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
        });

        socket.on('connect', () => {
            console.log('[Socket.IO] Connected:', socket.id);
            // Auto-rejoin all active rooms on reconnect
            Object.keys(bankRoomRefs).forEach((bankId) => {
                if (bankRoomRefs[bankId] > 0) {
                    socket.emit('join_bank', bankId);
                    console.log(`[Socket.IO] Rejoined room bank_${bankId} on reconnect`);
                }
            });
            Object.keys(paperRoomRefs).forEach((paperId) => {
                if (paperRoomRefs[paperId] > 0) {
                    socket.emit('join_paper', paperId);
                    console.log(`[Socket.IO] Rejoined room paper_${paperId} on reconnect`);
                }
            });
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket.IO] Disconnected:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('[Socket.IO] Connection error:', error.message);
        });
    }
    // If the socket was disconnected and exhausted retries, force reconnect
    if (!socket.connected && !socket.active) {
        console.log('[Socket.IO] Socket inactive, reconnecting...');
        socket.connect();
    }
    return socket;
}

export function joinPaperRoom(paperId) {
    const sock = getSocket();
    paperRoomRefs[paperId] = (paperRoomRefs[paperId] || 0) + 1;
    if (paperRoomRefs[paperId] === 1) {
        sock.emit('join_paper', paperId);
        console.log(`[Socket.IO] Joining room: paper_${paperId}`);
    }
}

export function leavePaperRoom(paperId) {
    if (!paperRoomRefs[paperId]) return;
    paperRoomRefs[paperId]--;
    if (paperRoomRefs[paperId] <= 0) {
        delete paperRoomRefs[paperId];
        const sock = getSocket();
        sock.emit('leave_paper', paperId);
        console.log(`[Socket.IO] Leaving room: paper_${paperId}`);
    }
}

export function onPaperUpdate(callback) {
    const sock = getSocket();
    sock.on('paper_updated', callback);
    return () => sock.off('paper_updated', callback);
}

export function subscribeToPaper(paperId, handlers) {
    const { onStatusChange, onCompleted, onFailed } = handlers;
    
    joinPaperRoom(paperId);
    
    const handleUpdate = (data) => {
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
    
    return () => {
        unsubscribe();
        leavePaperRoom(paperId);
    };
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('[Socket.IO] Manually disconnected');
    }
}

export function joinBankRoom(bankId) {
    const sock = getSocket();
    bankRoomRefs[bankId] = (bankRoomRefs[bankId] || 0) + 1;
    if (bankRoomRefs[bankId] === 1) {
        sock.emit('join_bank', bankId);
        console.log(`[Socket.IO] Joining room: bank_${bankId}`);
    }
}

export function leaveBankRoom(bankId) {
    if (!bankRoomRefs[bankId]) return;
    bankRoomRefs[bankId]--;
    if (bankRoomRefs[bankId] <= 0) {
        delete bankRoomRefs[bankId];
        const sock = getSocket();
        sock.emit('leave_bank', bankId);
        console.log(`[Socket.IO] Leaving room: bank_${bankId}`);
    }
}

export function onBankUpdate(callback) {
    const sock = getSocket();
    sock.on('bank_updated', callback);
    return () => sock.off('bank_updated', callback);
}

export function subscribeToBank(bankId, handlers) {
    const {
        onStatusChange,
        onSectionStarted,
        onSectionCompleted,
        onSectionShortfall,
        onQuestionGenerated,
        onQuestionsBatch,
        onCompleted,
        onFailed,
        // Turbo pipeline v2 events
        onPhaseChange,
        onDocumentStatus,
        onQuestionVerified,
        onVerificationCompleted,
        // Turbo pipeline v3 events (auto-fix)
        onQuestionUpdated,
        onQuestionRejected,
    } = handlers;
    
    joinBankRoom(bankId);
    
    const handleUpdate = (data) => {
        if (data.bankId !== bankId) return;
        
        console.log(`[Socket.IO] Bank update for ${bankId}:`, data.type);
        
        switch (data.type) {
            case 'status_change':
                onStatusChange?.(data.status, data);
                break;
            case 'section_started':
                onSectionStarted?.(data.sectionId, data);
                break;
            case 'section_completed':
                onSectionCompleted?.(data.sectionId, data);
                break;
            case 'section_shortfall':
                onSectionShortfall?.(data.sectionId, data);
                break;
            case 'question_generated':
                onQuestionGenerated?.(data.question, data);
                break;
            case 'questions_batch':
                onQuestionsBatch?.(data.questions, data);
                if (Array.isArray(data.questions)) {
                    data.questions.forEach((q) => onQuestionGenerated?.(q, data));
                }
                break;
            case 'generation_completed':
                onCompleted?.(data.questionBank, data);
                break;
            case 'generation_failed':
                onFailed?.(data.error, data);
                break;
            case 'question_refined':
                break;
            // Turbo pipeline v2 events
            case 'phase_change':
                onPhaseChange?.(data.phase, data);
                break;
            case 'document_status':
                onDocumentStatus?.(data.documentId, data);
                break;
            case 'question_verified':
                onQuestionVerified?.(data.results, data);
                break;
            case 'verification_completed':
                onVerificationCompleted?.(data);
                break;
            // Turbo pipeline v3 events (auto-fix)
            case 'question_updated':
                onQuestionUpdated?.(data.question, data);
                break;
            case 'question_rejected':
                onQuestionRejected?.(data.questionId, data);
                break;
            default:
                console.log('[Socket.IO] Unknown update type:', data.type);
        }
    };
    
    const unsubscribe = onBankUpdate(handleUpdate);
    
    return () => {
        unsubscribe();
        leaveBankRoom(bankId);
    };
}

export default {
    getSocket,
    joinPaperRoom,
    leavePaperRoom,
    onPaperUpdate,
    subscribeToPaper,
    disconnectSocket,
    joinBankRoom,
    leaveBankRoom,
    onBankUpdate,
    subscribeToBank
};
