
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkEmptyIDs() {
    try {
        const count = await prisma.client.count({
            where: { id: "" }
        });
        console.log(`Clients with empty ID: ${count}`);
        
        const clients = await prisma.client.findMany({
            where: { id: "" },
            take: 10
        });
        clients.forEach(c => console.log(`- ${c.name} (${c.phone})`));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkEmptyIDs();
