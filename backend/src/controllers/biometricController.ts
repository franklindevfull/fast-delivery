import { Request, Response } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/types';
import prisma from '../prisma.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_delivery_fast';
const RP_NAME = 'Delivery Fast';

const getRpId = (req: Request) => {
    if (process.env.RP_ID) return process.env.RP_ID;
    
    // Tenta extrair o domínio do Referer ou Origin (onde o usuário está navegando)
    const origin = req.get('origin') || req.get('referer');
    if (origin) {
        try {
            const url = new URL(origin);
            return url.hostname;
        } catch (e) {
            console.error('Error parsing origin for RP_ID:', e);
        }
    }
    return req.hostname;
};
const getOrigin = (req: Request) => {
    return process.env.FRONTEND_URL || req.get('origin') || `${req.protocol}://${req.get('host')}`;
};

// Temporary in-memory store for challenges (In production, use Redis or a DB table)
const challengeStore = new Map<string, string>();

/**
 * Registration: Step 1 - Generate Options
 */
export const getRegistrationOptions = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.body;
    const client = await prisma.client.findUnique({ where: { id: clientId } });

    if (!client) {
      return res.status(404).json({ message: 'Cliente não encontrado.' });
    }

    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: getRpId(req),
      userID: Buffer.from(client.id),
      userName: client.phone,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Force biometrics (Fingerprint/FaceID)
      },
    });

    // Save challenge to verify later
    challengeStore.set(`reg_${client.id}`, options.challenge);

    res.json(options);
  } catch (error) {
    console.error('Registration Options Error:', error);
    res.status(500).json({ message: 'Erro ao gerar opções de registro.' });
  }
};

/**
 * Registration: Step 2 - Verify and Save
 */
export const verifyRegistration = async (req: Request, res: Response) => {
  try {
    const { clientId, credential } = req.body;
    const expectedChallenge = challengeStore.get(`reg_${clientId}`);

    if (!expectedChallenge) {
      return res.status(400).json({ message: 'Desafio expirado ou não encontrado.' });
    }

    const verification = await verifyRegistrationResponse({
      response: credential as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
    } as any);

    if (verification.verified && (verification as any).registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = (verification as any).registrationInfo;

      await (prisma.client as any).update({
        where: { id: clientId },
        data: {
          webauthnId: Buffer.from(credentialID).toString('base64'),
          webauthnPublicKey: Buffer.from(credentialPublicKey).toString('base64'),
          webauthnCounter: counter,
        },
      });

      challengeStore.delete(`reg_${clientId}`);
      res.json({ verified: true });
    } else {
      res.status(400).json({ verified: false, message: 'Falha na verificação.' });
    }
  } catch (error) {
    console.error('Verify Registration Error:', error);
    res.status(500).json({ message: 'Erro ao verificar registro.' });
  }
};

/**
 * Login: Step 1 - Generate Options
 */
export const getLoginOptions = async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    const client = await (prisma.client as any).findFirst({ where: { phone } });

    if (!client || !client.webauthnId) {
      return res.status(404).json({ message: 'Biometria não configurada para este número.' });
    }

    const options = await generateAuthenticationOptions({
      rpID: getRpId(req),
      allowCredentials: [{
        id: Buffer.from(client.webauthnId, 'base64'),
        type: 'public-key',
        transports: ['internal'],
      } as any],
      userVerification: 'preferred',
    });

    // Save challenge
    challengeStore.set(`auth_${client.id}`, options.challenge);

    res.json(options);
  } catch (error) {
    console.error('Login Options Error:', error);
    res.status(500).json({ message: 'Erro ao gerar opções de login.' });
  }
};

/**
 * Login: Step 2 - Verify and Sign JWT
 */
export const verifyLogin = async (req: Request, res: Response) => {
  try {
    const { phone, credential } = req.body;
    const client = await (prisma.client as any).findFirst({ where: { phone } });

    if (!client || !client.webauthnId || !client.webauthnPublicKey) {
      return res.status(404).json({ message: 'Dados de biometria não encontrados.' });
    }

    const expectedChallenge = challengeStore.get(`auth_${client.id}`);
    if (!expectedChallenge) {
      return res.status(400).json({ message: 'Desafio expirado ou não encontrado.' });
    }

    const verification = await verifyAuthenticationResponse({
      response: credential as AuthenticationResponseJSON,
      expectedChallenge,
      expectedOrigin: getOrigin(req),
      expectedRPID: getRpId(req),
      credential: {
        id: Buffer.from(client.webauthnId, 'base64'),
        publicKey: Buffer.from(client.webauthnPublicKey, 'base64'),
        counter: client.webauthnCounter,
      },
    } as any);

    if (verification.verified) {
      // Update counter
      await (prisma.client as any).update({
        where: { id: client.id },
        data: { webauthnCounter: (verification as any).authenticationInfo.newCounter },
      });

      const token = jwt.sign({ id: client.id, role: 'CLIENT' }, JWT_SECRET, { expiresIn: '30d' });
      
      challengeStore.delete(`auth_${client.id}`);

      res.json({ token, client });
    } else {
      res.status(401).json({ verified: false, message: 'Falha na autenticação biométrica.' });
    }
  } catch (error) {
    console.error('Verify Login Error:', error);
    res.status(500).json({ message: 'Erro ao processar login.' });
  }
};
