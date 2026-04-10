import prisma from './prisma.js';
import { getIO } from './socket.js';

export interface StoreStatus {
    status: 'online' | 'offline';
    is_manually_closed: boolean;
    next_status_change: string | null;
    enableDigitalMenu: boolean;
}

let cachedSettings = {
    isManuallyClosed: true, // Começar fechado por segurança
    operatingHours: "[]",
    enableDigitalMenu: true
};

let lastCalculatedStatus: 'online' | 'offline' = 'offline';

export const updateCacheAndEmit = (isManuallyClosed: boolean, operatingHours: string, enableDigitalMenu?: boolean) => {
    cachedSettings.isManuallyClosed = isManuallyClosed;
    cachedSettings.operatingHours = operatingHours;
    if (enableDigitalMenu !== undefined) {
        cachedSettings.enableDigitalMenu = enableDigitalMenu;
    }

    const current = calculateCurrentStoreStatus();
    // Emit always to ensure frontend gets the latest settings (including enableDigitalMenu change)
    getIO().emit('store_status_changed', current);
    lastCalculatedStatus = current.status;
}

export const loadSettingsToCache = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const settings = await prisma.businessSettings.findUnique({ where: { key: 'main' } });
            if (settings) {
                cachedSettings.isManuallyClosed = (settings as any).isManuallyClosed ?? true;
                cachedSettings.operatingHours = (settings as any).operatingHours ?? "[]";
                cachedSettings.enableDigitalMenu = (settings as any).enableDigitalMenu ?? true;
                // Initially set lastCalculatedStatus without emitting since no clients are connected yet
                lastCalculatedStatus = calculateCurrentStoreStatus().status;
                console.log(`[STATUS-CACHE] Settings loaded successfully (attempt ${i + 1})`);
                break;
            } else {
                console.warn(`[STATUS-CACHE] Main settings not found, using defaults.`);
                break;
            }
        } catch (e) {
            console.error(`[STATUS-CACHE] Error loading settings to cache (attempt ${i + 1}/${retries}):`, e);
            if (i < retries - 1) {
                // Wait 2 seconds before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
};

export const getStoreStatus = (): StoreStatus => {
    return calculateCurrentStoreStatus();
}

const calculateCurrentStoreStatus = (): StoreStatus => {
    if (cachedSettings.isManuallyClosed) {
        return {
            status: 'offline',
            is_manually_closed: true,
            next_status_change: null,
            enableDigitalMenu: cachedSettings.enableDigitalMenu
        };
    }

    try {
        const hours = JSON.parse(cachedSettings.operatingHours);
        if (!Array.isArray(hours) || hours.length === 0) {
            return { status: 'offline', is_manually_closed: false, next_status_change: null, enableDigitalMenu: cachedSettings.enableDigitalMenu };
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
        const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
        const currentDayNum = dayMap[getP('weekday')] ?? now.getDay();
        const currentTimeInt = hour * 60 + minute;

        const todayConfig = hours.find((h: any) => h.dayOfWeek === currentDayNum);

        if (!todayConfig || !todayConfig.isOpen) {
            const result: StoreStatus = { status: 'offline', is_manually_closed: false, next_status_change: getNextOpenTime(hours, now), enableDigitalMenu: cachedSettings.enableDigitalMenu };
            console.log(`[STATUS-CHECK] Result: OFFLINE | Day: ${currentDayNum} | Config: CLOSED`);
            return result;
        }

        const openParts = todayConfig.openTime.split(':').map(Number);
        const closeParts = todayConfig.closeTime.split(':').map(Number);
        const openTimeInt = openParts[0] * 60 + openParts[1];
        let closeTimeInt = closeParts[0] * 60 + closeParts[1];

        let isOpenNow = false;
        if (closeTimeInt < openTimeInt) {
            if (currentTimeInt >= openTimeInt || currentTimeInt < closeTimeInt) isOpenNow = true;
        } else {
            if (currentTimeInt >= openTimeInt && currentTimeInt < closeTimeInt) isOpenNow = true;
        }

        if (isOpenNow) {
            let y = parseInt(getP('year'));
            let m = parseInt(getP('month')) - 1;
            let d = parseInt(getP('day'));

            if (closeTimeInt < openTimeInt && currentTimeInt >= openTimeInt) {
                const tempDate = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                tempDate.setDate(tempDate.getDate() + 1);
                y = tempDate.getFullYear();
                m = tempDate.getMonth();
                d = tempDate.getDate();
            }

            const closingISO = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}T${todayConfig.closeTime}:00-03:00`;
            const result: StoreStatus = { status: 'online', is_manually_closed: false, next_status_change: new Date(closingISO).toISOString(), enableDigitalMenu: cachedSettings.enableDigitalMenu };
            console.log(`[STATUS-CHECK] Result: ONLINE | Time: ${hour}:${minute} | Day: ${currentDayNum}`);
            return result;
        } else {
            const result: StoreStatus = { status: 'offline', is_manually_closed: false, next_status_change: getNextOpenTime(hours, now), enableDigitalMenu: cachedSettings.enableDigitalMenu };
            console.log(`[STATUS-CHECK] Result: OFFLINE | Time: ${hour}:${minute} | Day: ${currentDayNum}`);
            return result;
        }
    } catch (e) {
        console.error("Store status calculation error:", e);
        return { status: 'offline', is_manually_closed: false, next_status_change: null, enableDigitalMenu: cachedSettings.enableDigitalMenu };
    }
};

const getNextOpenTime = (hours: any[], nowObj: Date): string | null => {
    try {
        const spBase = new Date(nowObj.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        
        for (let i = 0; i < 7; i++) {
            const checkDate = new Date(spBase);
            checkDate.setDate(checkDate.getDate() + i);
            const dayOfWeek = checkDate.getDay();
            const config = hours.find(h => h.dayOfWeek === dayOfWeek);

            if (config && config.isOpen) {
                const openParts = config.openTime.split(':').map(Number);
                const openTimeInt = openParts[0] * 60 + openParts[1];

                if (i === 0) {
                    const currentTimeInt = spBase.getHours() * 60 + spBase.getMinutes();
                    if (currentTimeInt >= openTimeInt) {
                        continue;
                    }
                }

                const y = checkDate.getFullYear();
                const m = String(checkDate.getMonth() + 1).padStart(2, '0');
                const d = String(checkDate.getDate()).padStart(2, '0');
                
                const openISO = `${y}-${m}-${d}T${config.openTime}:00-03:00`;
                return new Date(openISO).toISOString();
            }
        }
    } catch (e) {
        console.error("Error calculating next open time:", e);
    }
    return null;
}

// Check every minute if the status changed automatically
setInterval(() => {
    const current = calculateCurrentStoreStatus();
    if (current.status !== lastCalculatedStatus) {
        console.log(`[AUTO-STATUS] Changing status from ${lastCalculatedStatus} to ${current.status}`);
        lastCalculatedStatus = current.status;
        getIO().emit('store_status_changed', current);
    }
}, 60000); // Check every 60 seconds for better precision
