
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkOrders() {
    try {
        const orderCount = await prisma.order.count({
            where: { clientId: "" }
        });
        console.log(`Orders with empty clientId: ${orderCount}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkOrders();
