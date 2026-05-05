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
    // Filtramos o campo 'user' que é injetado pelo middleware de autenticação
    // e outros campos que não pertencem ao modelo BusinessSettings
    const { 
        key, user, name, cnpj, address, phone, deliveryFee, tableCount, 
        restaurantLat, restaurantLng, geofenceRadius, isManuallyClosed, 
        operatingHours, enableDeliveryApp, enableDigitalMenu, 
        enableWaiterApp, enableDriverApp, orderTimeoutMinutes, maxChange,
        serviceFeeStatus, serviceFeePercentage, printerIp, printerType,
        pizzaPriceRule, pizzaNfeRule, paymentMethods, pixKey, ...rest 
    } = req.body;

    const data = {
        name: name || '',
        cnpj: cnpj || '',
        address: address || '',
        phone: phone || '',
        deliveryFee: deliveryFee || 'R$ 0,00',
        tableCount: parseInt(tableCount as any) || 0,
        restaurantLat: restaurantLat ? parseFloat(restaurantLat as any) : null,
        restaurantLng: restaurantLng ? parseFloat(restaurantLng as any) : null,
        geofenceRadius: parseInt(geofenceRadius as any) || 30,
        isManuallyClosed: !!isManuallyClosed,
        operatingHours: operatingHours || '[]',
        enableDeliveryApp: enableDeliveryApp !== false,
        enableDigitalMenu: enableDigitalMenu !== false,
        enableWaiterApp: enableWaiterApp !== false,
        enableDriverApp: enableDriverApp !== false,
        orderTimeoutMinutes: parseInt(orderTimeoutMinutes as any) || 5,
        maxChange: parseFloat(maxChange as any) || 0,
        serviceFeeStatus: serviceFeeStatus !== false,
        serviceFeePercentage: parseFloat(serviceFeePercentage as any) || 10,
        printerIp: printerIp || null,
        printerType: printerType || 'EPSON',
        pizzaPriceRule: pizzaPriceRule || 'HIGHEST',
        pizzaNfeRule: pizzaNfeRule || 'OBSERVATION',
        paymentMethods: paymentMethods || {},
        pixKey: pixKey || '',
        ...rest
    };

    // Removemos explicitamente o 'user' se ele tiver caído no ...rest
    if ((data as any).user) delete (data as any).user;

    const settings = await prisma.businessSettings.upsert({
        where: { key: 'main' },
        update: data,
        create: { ...data, key: 'main' }
    });
    updateCacheAndEmit(settings.isManuallyClosed, settings.operatingHours, settings.enableDigitalMenu);
    res.json(settings);
};
