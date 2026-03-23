import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

// Força o limite de 1 conexão para evitar estourar a RAM no plano Free do Render
const databaseUrl = process.env.DATABASE_URL || '';
// No plano free do Render somos obrigados a usar poucas conexões.
// Localmente aumentamos o limite para evitar timeouts durante o desenvolvimento.
const isRender = !!process.env.RENDER;
const connectionLimit = isRender ? 1 : 10;
const timeout = 30;

const finalUrl = databaseUrl.includes('connection_limit')
    ? databaseUrl
    : `${databaseUrl}${databaseUrl.includes('?') ? '&' : '?'}connection_limit=${connectionLimit}&pool_timeout=${timeout}`;

export const prisma = new PrismaClient({
    datasources: {
        db: {
            url: finalUrl
        }
    }
});

export default prisma;
