import 'dotenv/config'; 
import express from 'express';

process.on('uncaughtException', (err) => {
    console.error(' [CRITICAL ERROR] Uncaught Exception:', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(' [CRITICAL ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
});
import cors from 'cors';
import compression from 'compression';
import cron from 'node-cron';
import { autoCloseCashSessions } from './controllers/cashController.js';
import prisma from './prisma.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import clientAuthRoutes from './routes/clientAuthRoutes.js';
import productRoutes from './routes/productRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import driverRoutes from './routes/driverRoutes.js';
import waiterRoutes from './routes/waiterRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import tableRoutes from './routes/tableRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import cashRoutes from './routes/cashRoutes.js';
import receivableRoutes from './routes/receivableRoutes.js';
import maintenanceRoutes from './routes/maintenanceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import backupRoutes from './routes/backupRoutes.js';
import supportRoutes from './routes/supportRoutes.js';
import promotionRoutes from './routes/promotionRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
// import printRoutes from './routes/printRoutes.js';
import { initSocket } from './socket.js';
import { startOrderTimeoutService } from './services/orderTimeoutService.js';
import { loadSettingsToCache } from './storeStatusCache.js';
import http from 'http';

const app = express();

// Configurações de CORS - DEVE SER O PRIMEIRO MIDDLEWARE
const allowedOrigins = [
    'https://fast-delivery-frontend-iq8a.onrender.com',
    'https://fast-delivery-menu-digital.onrender.com',
    'https://fast-delivery-garcom.onrender.com',
    'https://fast-delivery-entregador.onrender.com',
    'https://fast-delivery-app.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
];

app.use(cors({
    origin: (origin, callback) => {
        // Permite requisições sem origin (como mobile apps ou ferramentas de teste)
        if (!origin) return callback(null, true);

        // Verifica se está na lista fixa ou se é um subdomínio válido do projeto no Render
        const isAllowed = allowedOrigins.includes(origin) || 
                         origin.match(/^https:\/\/fast-delivery-.*\.onrender\.com$/);

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`[CORS-WARN] Bloqueado: ${origin}`);
            callback(null, true); // Mantemos true para debug, mas com aviso no log
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    optionsSuccessStatus: 200 // Compatibilidade com navegadores legados
}));

app.use(compression());
const port = process.env.PORT || 3000;
const server = http.createServer(app);
initSocket(server);

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/client-auth', clientAuthRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/waiters', waiterRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/public', publicRoutes); // Rotas abertas para clientes e cardápio digital
app.use('/api/chat', chatRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/receivables', receivableRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/campaigns', campaignRoutes);
// app.use('/api/print', printRoutes);

// Basic health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    loadSettingsToCache();
    startOrderTimeoutService();
    autoCloseCashSessions(); // Run on startup to catch missed closures

    // Auto closure cron job (every 10 minutes)
    cron.schedule('*/10 * * * *', async () => {
        await autoCloseCashSessions();
    });
});
