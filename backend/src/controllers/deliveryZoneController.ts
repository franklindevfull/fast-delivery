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
