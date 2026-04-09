import { io } from 'socket.io-client';

const SOCKET_URL = (import.meta as any).env.VITE_API_URL
    ? (import.meta as any).env.VITE_API_URL.replace('/api', '')
    : 'http://localhost:3000';

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ['websocket'],
    withCredentials: true
});

socket.on('connect', () => {
    console.log('[SOCKET] App Cliente conectado:', socket.id);
    console.log('[SOCKET] Transporte atual:', socket.io.engine.transport.name);
});

socket.on('connect_error', (err) => {
    console.error('[SOCKET] Erro de conexão:', err.message);
});

socket.on('disconnect', (reason) => {
    console.log('[SOCKET] App Cliente desconectado. Motivo:', reason);
});
