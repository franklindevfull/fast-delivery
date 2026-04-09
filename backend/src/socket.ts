import { Server } from 'socket.io';
import http from 'http';

let io: Server;

export const initSocket = (server: http.Server) => {
    io = new Server(server, {
        cors: {
            origin: [
                'https://fast-delivery-frontend-iq8a.onrender.com',
                'https://fast-delivery-menu-digital.onrender.com',
                'https://fast-delivery-garcom.onrender.com',
                'https://fast-delivery-entregador.onrender.com',
                'https://fast-delivery-app.onrender.com',
                'http://localhost:5173',
                'http://localhost:3000',
                'http://127.0.0.1:5173',
                'http://127.0.0.1:3000',
                'http://[::1]:5173',
                'http://[::1]:3000'
            ],
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingInterval: 25000, // Valores padrão mais relaxados para o Render
        pingTimeout: 20000,
        transports: ['polling', 'websocket'], // Inicia com polling para estabilizar handshake
        path: '/socket.io',
        addTrailingSlash: false
    });

    io.on('connection', (socket) => {
        try {
            const origin = socket.handshake?.headers?.origin;
            const ua = socket.handshake?.headers?.['user-agent'];
            const transport = socket.conn?.transport?.name || 'unknown';
            
            console.log(`[SOCKET] Novo Cliente: ${socket.id}`);
            console.log(`[SOCKET] Origem: ${origin || 'Desconhecida'}`);
            console.log(`[SOCKET] Transporte: ${transport}`);
            console.log(`[SOCKET] User-Agent: ${ua || 'N/A'}`);
            
            (socket as any).connectedAt = Date.now();

            socket.on('join_chat', (driverId: string) => {
                try {
                    socket.join(`chat_${driverId}`);
                    console.log(`[SOCKET] ${socket.id} entrou chat motorista ${driverId} | Transporte: ${socket.conn.transport.name}`);
                } catch (err: any) {
                    console.error(`[SOCKET ERROR] FAILED join_chat for ${socket.id}:`, err.message);
                }
            });

            socket.on('join_client', (clientId: string) => {
                try {
                    socket.join(`client_${clientId}`);
                    console.log(`[SOCKET] ${socket.id} entrou sala cliente ${clientId}`);
                } catch (err: any) {
                    console.error(`[SOCKET ERROR] FAILED join_client for ${socket.id}:`, err.message);
                }
            });

            socket.on('join_table', (tableNumber: any) => {
                try {
                    const num = Number(tableNumber);
                    if (!isNaN(num)) {
                        socket.join(`table_${num}`);
                        console.log(`[SOCKET] ${socket.id} entrou sala mesa ${num}`);
                    }
                } catch (err: any) {
                    console.error(`[SOCKET ERROR] FAILED join_table for ${socket.id}:`, err.message);
                }
            });

            socket.on('send_message', (data: { driverId: string, content: string, senderName: string, isFromDriver: boolean }) => {
                try {
                    io.to(`chat_${data.driverId}`).emit('new_message', data);
                } catch (err: any) {
                    console.error(`[SOCKET ERROR] FAILED send_message from ${socket.id}:`, err.message);
                }
            });

            socket.on('disconnect', (reason) => {
                const duration = Math.round((Date.now() - (socket as any).connectedAt) / 1000) || 0;
                console.log(`[SOCKET] Cliente desconectado: ${socket.id} | Motivo: ${reason} | Duração: ${duration}s | Transporte: ${socket.conn.transport.name}`);
            });
        } catch (error: any) {
            console.error('[SOCKET ERROR] Erro fatal no evento de conexão:', error.message);
            console.error(error.stack);
        }
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.io não inicializado!');
    }
    return io;
};
