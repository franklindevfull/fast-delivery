import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function checkSettings() {
    try {
        const settings = await prisma.businessSettings.findUnique({
            where: { key: 'main' }
        });
        if (settings) {
            console.log('isManuallyClosed:', settings.isManuallyClosed);
            console.log('operatingHours:', settings.operatingHours);
        } else {
            console.log('No settings found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkSettings();
