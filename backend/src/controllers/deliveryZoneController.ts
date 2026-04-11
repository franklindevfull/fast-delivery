import { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getAllZones = async (req: Request, res: Response) => {
    try {
        const zones = await prisma.deliveryZone.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(zones);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createZone = async (req: Request, res: Response) => {
    try {
        const { name, fee, active } = req.body;
        const zone = await prisma.deliveryZone.create({
            data: { name, fee, active }
        });
        res.json(zone);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const updateZone = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, fee, active } = req.body;
        const zone = await prisma.deliveryZone.update({
            where: { id },
            data: { name, fee, active }
        });
        res.json(zone);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const deleteZone = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.deliveryZone.delete({
            where: { id }
        });
        res.status(204).send();
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const bulkImportZones = async (req: Request, res: Response) => {
    try {
        const { zones } = req.body;
        if (!Array.isArray(zones)) {
            return res.status(400).json({ error: 'Zones must be an array' });
        }

        const results = await prisma.$transaction(async (tx: any) => {
            const upserts = zones.map((zone: any) => {
                const normalizedName = (zone.name || '').toUpperCase().trim();
                if (!normalizedName) return null;
                return tx.deliveryZone.upsert({
                    where: { name: normalizedName },
                    update: { fee: parseFloat(zone.fee) || 0, active: true },
                    create: { name: normalizedName, fee: parseFloat(zone.fee) || 0, active: true }
                });
            });
            return Promise.all(upserts.filter(Boolean));
        });

        res.json({ success: true, count: results.length });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
