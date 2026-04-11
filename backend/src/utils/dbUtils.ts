
import { Prisma } from '@prisma/client';

/**
 * Utilitário para executar operações do Prisma com retentativas automáticas.
 * Útil para lidar com "Cold Starts" ou suspensões de banco no Render Free.
 */
export async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
): Promise<T> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await operation();
        } catch (error: any) {
            lastError = error;

            // P1001: Can't reach database server
            // P1002: The database server was reached but timed out
            // P1003: Database does not exist
            // P1008: Operations timed out
            const isConnectionError = 
                error instanceof Prisma.PrismaClientInitializationError ||
                error instanceof Prisma.PrismaClientKnownRequestError ||
                error.message?.includes('P1001') ||
                error.message?.includes('P1002') ||
                error.message?.includes('Can\'t reach database');

            if (isConnectionError && i < maxRetries - 1) {
                const currentDelay = delay * (i + 1);
                console.warn(`[DB-RETRY] Falha na conexão. Tentativa ${i + 1}/${maxRetries}. Aguardando ${currentDelay}ms... Error: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, currentDelay));
                continue;
            }

            throw error;
        }
    }

    throw lastError;
}
