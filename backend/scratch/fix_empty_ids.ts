
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid'; // I'll check if uuid is available, else I'll use crypto.randomUUID()
import crypto from 'crypto';

const prisma = new PrismaClient();

async function fixEmptyIDs() {
    try {
        const clients = await prisma.client.findMany({
            where: { id: "" }
        });

        if (clients.length === 0) {
            console.log('No clients with empty ID found.');
            return;
        }

        console.log(`Found ${clients.length} clients with empty ID. Fixing...`);

        for (const client of clients) {
            const newId = crypto.randomUUID();
            console.log(`Updating ${client.name} (${client.phone}) to new ID: ${newId}`);
            
            // In Prisma, we can't update a primary key directly easily if we don't know the type.
            // But since no orders are linked, we can delete and recreate or use a raw query if needed.
            // A safer way is using a raw SQL query to update the primary key.
            
            await prisma.$executeRawUnsafe(
                `UPDATE "Client" SET id = $1 WHERE id = ''`,
                newId
            );
        }

        console.log('Database fix completed.');
    } catch (e) {
        console.error('Error during database fix:', e);
    } finally {
        await prisma.$disconnect();
    }
}

fixEmptyIDs();
