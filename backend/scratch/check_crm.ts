
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkCRM() {
    try {
        const clients = await prisma.client.findMany({
            take: 5
        });
        console.log('Sample clients:');
        clients.forEach(c => {
            console.log(`- ID: "${c.id}", Name: "${c.name}", mustChangePassword: ${c.mustChangePassword}`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkCRM();
