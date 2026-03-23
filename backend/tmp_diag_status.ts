import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function checkStatusLogic() {
    try {
        const settings = await prisma.businessSettings.findUnique({
            where: { key: 'main' }
        });
        
        if (!settings) {
            console.log('No settings found');
            return;
        }

        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: "America/Sao_Paulo",
            hour: 'numeric', minute: 'numeric', second: 'numeric',
            weekday: 'short', year: 'numeric', month: 'numeric', day: 'numeric',
            hour12: false
        });
        
        const parts = formatter.formatToParts(now);
        const getP = (type: string) => parts.find(p => p.type === type)?.value || '0';
        
        const hour = parseInt(getP('hour'));
        const minute = parseInt(getP('minute'));
        const weekday = getP('weekday');
        
        const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
        const currentDayNum = dayMap[weekday] ?? now.getDay();
        
        console.log('System Date (UTC):', now.toISOString());
        console.log('SP Date parts:', JSON.stringify(parts));
        console.log('Weekday:', weekday);
        console.log('Calculated DayNum:', currentDayNum);
        console.log('Calculated Time (HH:mm):', `${hour}:${minute}`);
        
        const hours = JSON.parse(settings.operatingHours);
        const todayConfig = hours.find((h: any) => h.dayOfWeek === currentDayNum);
        
        console.log('Today Config:', JSON.stringify(todayConfig));
        
        if (settings.isManuallyClosed) {
            console.log('Result: OFFLINE (Manually Closed)');
        } else if (!todayConfig || !todayConfig.isOpen) {
            console.log('Result: OFFLINE (Closed today or not found)');
        } else {
            const openParts = todayConfig.openTime.split(':').map(Number);
            const closeParts = todayConfig.closeTime.split(':').map(Number);
            const currentTimeInt = hour * 60 + minute;
            const openTimeInt = openParts[0] * 60 + openParts[1];
            const closeTimeInt = closeParts[0] * 60 + closeParts[1];
            
            console.log('Times (minutes from midnight):', { current: currentTimeInt, open: openTimeInt, close: closeTimeInt });
            
            let isOpenNow = false;
            if (closeTimeInt < openTimeInt) {
                if (currentTimeInt >= openTimeInt || currentTimeInt < closeTimeInt) isOpenNow = true;
            } else {
                if (currentTimeInt >= openTimeInt && currentTimeInt < closeTimeInt) isOpenNow = true;
            }
            
            console.log('Result:', isOpenNow ? 'ONLINE' : 'OFFLINE');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkStatusLogic();
