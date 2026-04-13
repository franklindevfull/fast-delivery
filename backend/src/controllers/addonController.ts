import { Request, Response } from "express";
import prisma from "../prisma.js";

export const getAddonGroups = async (req: Request, res: Response) => {
  try {
    const groups = await prisma.addonGroup.findMany({
      include: {
        options: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(groups);
  } catch (error) {
    console.error("Error fetching addon groups:", error);
    res.status(500).json({ error: "Failed to fetch addon groups" });
  }
};

export const getAddonGroupById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const group = await prisma.addonGroup.findUnique({
      where: { id },
      include: { options: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Addon group not found" });
    }
    res.json(group);
  } catch (error) {
    console.error("Error fetching addon group:", error);
    res.status(500).json({ error: "Failed to fetch addon group" });
  }
};

export const createAddonGroup = async (req: Request, res: Response) => {
  const { name, selectionType, isRequired, options, active } = req.body;
  try {
    const group = await prisma.addonGroup.create({
      data: {
        name,
        selectionType,
        isRequired,
        active: active !== undefined ? active : true,
        options: {
          create: options?.map((opt: any) => ({
            name: opt.name,
            price: opt.price || 0,
            trackStock: opt.trackStock || false,
            stock: opt.stock || 0,
            active: opt.active !== undefined ? opt.active : true,
          })),
        },
      },
      include: { options: true },
    });
    res.status(201).json(group);
  } catch (error) {
    console.error("Error creating addon group:", error);
    res.status(500).json({ error: "Failed to create addon group" });
  }
};

export const updateAddonGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, selectionType, isRequired, options, active } = req.body;

  try {
    // Delete existing options and recreate to simplify updates 
    // (a more complex diffing approach could be used, but this is simpler for pure UI replacement)
    // Actually, destroying the options would break referencing IDs if they are heavily linked.
    // But since orderItems uses a snapshot (Json selectedAddons), it's safe to recreate options inside a group.
    
    await prisma.addonOption.deleteMany({
      where: { groupId: id }
    });

    const group = await prisma.addonGroup.update({
      where: { id },
      data: {
        name,
        selectionType,
        isRequired,
        active,
        options: {
          create: options?.map((opt: any) => ({
            name: opt.name,
            price: opt.price || 0,
            trackStock: opt.trackStock || false,
            stock: opt.stock || 0,
            active: opt.active !== undefined ? opt.active : true,
          })),
        },
      },
      include: { options: true },
    });
    res.json(group);
  } catch (error) {
    console.error("Error updating addon group:", error);
    res.status(500).json({ error: "Failed to update addon group" });
  }
};

export const deleteAddonGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.addonGroup.delete({
      where: { id },
    });
    res.json({ message: "Addon group deleted successfully" });
  } catch (error) {
    console.error("Error deleting addon group:", error);
    res.status(500).json({ error: "Failed to delete addon group" });
  }
};

export const copyAddonGroup = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const originalGroup = await prisma.addonGroup.findUnique({
      where: { id },
      include: { options: true },
    });

    if (!originalGroup) {
      return res.status(404).json({ error: "Addon group not found" });
    }

    const copiedGroup = await prisma.addonGroup.create({
      data: {
        name: `${originalGroup.name} - Cópia`,
        selectionType: originalGroup.selectionType,
        isRequired: originalGroup.isRequired,
        active: originalGroup.active,
        options: {
          create: originalGroup.options.map((opt) => ({
            name: opt.name,
            price: opt.price,
            trackStock: opt.trackStock,
            stock: opt.stock,
            active: opt.active,
          })),
        },
      },
      include: { options: true },
    });

    res.status(201).json(copiedGroup);
  } catch (error) {
    console.error("Error copying addon group:", error);
    res.status(500).json({ error: "Failed to copy addon group" });
  }
};
