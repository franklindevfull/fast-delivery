import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Coupons:");
    console.log(await prisma.coupon.findMany());
}
main().catch(console.error).finally(()=>prisma.$disconnect());
