
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function test() {
    try {
        const client = await prisma.client.findFirst();
        if (!client) {
            console.log('No client found to test');
            return;
        }

        console.log('Original client:', client);
        
        const clientResponse = {
            ...client,
            mustChangePassword: true
        };

        console.log('Client response after spread:', clientResponse);
        console.log('Has ID?', 'id' in clientResponse);
        console.log('ID value:', clientResponse.id);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
