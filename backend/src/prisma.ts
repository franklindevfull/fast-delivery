import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

// Força o limite de 1 conexão para evitar estourar a RAM no plano Free do Render
const databaseUrl = process.env.DATABASE_URL || '';
// No plano free do Render somos obrigados a usar poucas conexões.
// Localmente aumentamos o limite para evitar timeouts durante o desenvolvimento.
const isRender = !!process.env.RENDER;
const connectionLimit = isRender ? 1 : 10;
const poolTimeout = 30;
const connectTimeout = 20; // Aumentado para lidar com Cold Starts no Render

const finalUrl = databaseUrl.includes('connection_limit')
    ? databaseUrl
    : `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}&connect_timeout=${connectTimeout}`;

export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: finalUrl
        }
    }
});

/**
 * Tenta realizar a conexão inicial com o banco de dados com retentativas.
 * Útil para "acordar" o banco no Render durante o deploy/startup.
 */
export const warmupDatabase = async (retries = 5, delay = 2000) => {
    console.log(`[DB-WARMUP] Iniciando tentativa de conexão (${retries} retentativas restantes)...`);
    for (let i = 0; i < retries; i++) {
        try {
            // Tenta uma query simples para validar a conexão
            await prisma.$queryRaw`SELECT 1`;
            console.log('[DB-WARMUP] Conexão com o banco de dados estabelecida com sucesso!');
            return true;
        } catch (error: any) {
            console.warn(`[DB-WARMUP] Falha na tentativa ${i + 1}: ${error.message}`);
            if (i < retries - 1) {
                const nextDelay = delay * (i + 1); // Delay progressivo
                console.log(`[DB-WARMUP] Aguardando ${nextDelay}ms antes da próxima tentativa...`);
                await new Promise(res => setTimeout(res, nextDelay));
            }
        }
    }
    console.error('[DB-WARMUP] Não foi possível estabelecer conexão com o banco após várias tentativas.');
    return false;
};

export default prisma;
