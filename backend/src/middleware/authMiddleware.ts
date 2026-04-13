import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_delivery_fast';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  // Ignora rotas públicas ou de autenticação
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/recovery/verify',
    '/api/auth/reset-password',
    '/api/client-auth/login',
    '/api/client-auth/register',
    '/api/client-auth/recover',
    '/api/client-auth/google',
    '/api/client-auth/check-phone',
    '/api/client-auth/check-google-account',
    '/api/client-auth/biometric/login-options',
    '/api/client-auth/biometric/login-verify',
    '/api/public',      // prefixes
    '/health'
  ];

  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token de autenticação ausente ou malformado.' });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string, role?: string, permissions?: string[] };
    
    // Anexamos os dados base primeiro.
    req.user = decoded;

    // (Opcional, porém recomendado para segurança extrema: checar se usuário ainda existe/está ativo)
    if (decoded.role === 'CLIENT') {
       const client = await prisma.client.findUnique({ where: { id: decoded.id } });
       if (!client) return res.status(401).json({ message: 'Cliente não encontrado ou removido.' });
       req.user = { id: client.id, role: 'CLIENT', name: client.name };
    } else {
       const user = await prisma.user.findUnique({ where: { id: decoded.id } });
       if (!user || !user.active) {
         return res.status(401).json({ message: 'Usuário Inativo ou não encontrado.' });
       }
       req.user = { id: user.id, role: 'ADMIN', name: user.name, permissions: user.permissions };
    }
    
    // OVERRIDE for IDOR protection: overwrite any forged req.body.user with the verified identity
    if (req.body) {
        req.body.user = req.user;
    }
    
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token inválido ou expirado.' });
  }
};
