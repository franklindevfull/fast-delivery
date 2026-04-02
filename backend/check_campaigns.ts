import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCampaigns() {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('--- ALL CAMPAIGNS ---');
    campaigns.forEach(c => {
      console.log(`[${c.status}] Title: "${c.title}" | Type: ${c.type} | SentAt: ${c.sentAt || 'N/A'}`);
    });
    
    const notifications = await prisma.notification.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });
    console.log('--- RECENT NOTIFICATIONS ---');
    notifications.forEach(n => {
        console.log(`[${n.isRead ? 'READ' : 'UNREAD'}] To Client ${n.clientId}: "${n.title}"`);
    });

  } catch (error) {
    console.error('Error checking campaigns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCampaigns();
