import { Request, Response } from 'express';
import prisma from '../prisma.js';
import { updateCacheAndEmit } from '../storeStatusCache.js';


export const getSettings = async (req: Request, res: Response) => {
    const settings = await prisma.businessSettings.findUnique({
        where: { key: 'main' }
    });
    res.json(settings);
};

export const saveSettings = async (req: Request, res: Response) => {
    const { 
        key, name, cnpj, address, phone, deliveryFee, tableCount, 
        restaurantLat, restaurantLng, geofenceRadius, isManuallyClosed, 
        operatingHours, enableDeliveryApp, enableDigitalMenu, 
        enableWaiterApp, enableDriverApp, orderTimeoutMinutes, maxChange,
        serviceFeeStatus, serviceFeePercentage, printerIp, printerType,
        pizzaPriceRule, pizzaNfeRule, paymentMethods, pixKey, ...rest 
    } = req.body;

    const data = {
        name, cnpj, address, phone, deliveryFee, tableCount,
        restaurantLat, restaurantLng, geofenceRadius, isManuallyClosed,
        operatingHours, enableDeliveryApp, enableDigitalMenu,
        enableWaiterApp, enableDriverApp, orderTimeoutMinutes, maxChange,
        serviceFeeStatus, serviceFeePercentage, printerIp, printerType,
        pizzaPriceRule, pizzaNfeRule, paymentMethods, pixKey,
        ...rest
    };

    const settings = await prisma.businessSettings.upsert({
        where: { key: 'main' },
        update: data,
        create: { ...data, key: 'main' }
    });
    updateCacheAndEmit(settings.isManuallyClosed, settings.operatingHours, settings.enableDigitalMenu);
    res.json(settings);
};
