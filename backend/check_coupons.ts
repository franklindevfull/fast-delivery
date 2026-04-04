import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const coupons = await prisma.coupon.findMany();
    console.log(JSON.stringify(coupons, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
