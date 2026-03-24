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
    let origin = process.env.FRONTEND_URL || req.get('origin') || `${req.protocol}://${req.get('host')}`;
    if (origin.endsWith('/')) {
        origin = origin.slice(0, -1);
    }
    return origin;
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
        residentKey: 'required', // Melhor suporte para Passkeys no Android
        userVerification: 'required',
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

    const expectedOrigin = getOrigin(req);
    const expectedRPID = getRpId(req);

    console.log('[BIOMETRIC] Verifying Registration:', {
      clientId,
      expectedChallenge,
      expectedOrigin,
      expectedRPID
    });

    const verification = await verifyRegistrationResponse({
      response: credential as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
    } as any);

    console.log('[BIOMETRIC] Verification Result:', JSON.stringify(verification, null, 2));

    if (verification.verified && (verification as any).registrationInfo) {
      const regInfo = (verification as any).registrationInfo;
      
      // Defensive extraction for different library versions or authenticator behaviors
      // No SimpleWebAuthn v12/13, os nomes preferenciais são credentialPublicKey e credentialID (Uint8Array)
      // No entanto, conforme visto nos logs do usuário, os dados podem estar dentro de um objeto 'credential'
      const credentialPublicKey = regInfo.credentialPublicKey || (regInfo as any).publicKey || (regInfo.credential ? (regInfo.credential as any).publicKey : undefined);
      const credentialID = regInfo.credentialID || (regInfo as any).id || (regInfo as any).credentialId || (regInfo.credential ? (regInfo.credential as any).id : undefined);
      const counter = regInfo.counter !== undefined ? regInfo.counter : (regInfo as any).signCount || 0;

      if (!credentialID || !credentialPublicKey) {
        console.error('[BIOMETRIC] INCOMPLETE REGISTRATION INFO DETECTED:', {
            hasRegInfo: !!regInfo,
            keys: regInfo ? Object.keys(regInfo) : [],
            clientId
        });
        
        // Se ainda assim as propriedades diretas falharem, tentamos extrair do objeto retornado pela verificação caso esteja em outro lugar
        const alternativeID = (verification as any).credentialID || (verification as any).credentialId || (verification as any).credential?.id;
        const alternativeKey = (verification as any).credentialPublicKey || (verification as any).publicKey || (verification as any).credential?.publicKey;
        
        if (alternativeID && alternativeKey) {
            console.log('[BIOMETRIC] Using alternative extraction path');
            // Continuar com as alternativas... (será atribuído abaixo se necessário)
        } else {
            return res.status(400).json({ verified: false, message: 'Dados de credencial incompletos do autenticador.' });
        }
      }

      const finalCredentialID = credentialID || (verification as any).credentialID || (verification as any).credentialId || (verification as any).credential?.id;
      const finalPublicKey = credentialPublicKey || (verification as any).credentialPublicKey || (verification as any).publicKey || (verification as any).credential?.publicKey;

      // Utility to ensure we have a Buffer for DB storage
      const ensureBuffer = (val: any): Buffer => {
        if (Buffer.isBuffer(val)) return val;
        if (val instanceof Uint8Array) return Buffer.from(val);
        if (typeof val === 'string') {
            // WebAuthn uses base64url for IDs/Keys in JSON format
            return Buffer.from(val, 'base64url');
        }
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            // Handle JSON stringified Uint8Array { "0": 1, "1": 2 ... }
            const vals = Object.values(val);
            if (vals.every(v => typeof v === 'number')) {
                return Buffer.from(vals as number[]);
            }
        }
        return Buffer.from(val);
      };

      await (prisma.client as any).update({
        where: { id: clientId },
        data: {
          webauthnId: ensureBuffer(finalCredentialID).toString('base64'),
          webauthnPublicKey: ensureBuffer(finalPublicKey).toString('base64'),
          webauthnCounter: counter,
        },
      });

      challengeStore.delete(`reg_${clientId}`);
      res.json({ verified: true });
    } else {
      console.warn('[BIOMETRIC] Verification failed or missing registrationInfo');
      res.status(400).json({ verified: false, message: 'Falha na verificação da biometria.' });
    }
  } catch (error: any) {
    console.error('Verify Registration Error:', error);
    res.status(500).json({ message: `Erro interno na verificação: ${error.message}` });
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

    const expectedOrigin = getOrigin(req);
    const expectedRPID = getRpId(req);

    console.log('[BIOMETRIC] Verifying Login:', {
      phone,
      expectedChallenge,
      expectedOrigin,
      expectedRPID,
      clientWebauthnId: client.webauthnId ? client.webauthnId.substring(0, 10) + '...' : null
    });

    let verification;
    try {
        verification = await verifyAuthenticationResponse({
        response: credential as AuthenticationResponseJSON,
        expectedChallenge,
        expectedOrigin,
        expectedRPID,
        credential: {
            id: Buffer.from(client.webauthnId, 'base64'),
            publicKey: Buffer.from(client.webauthnPublicKey, 'base64'),
            counter: client.webauthnCounter,
        },
        } as any);
        console.log('[BIOMETRIC] Login Verification Result:', JSON.stringify(verification, null, 2));
    } catch (verifError: any) {
        console.error('[BIOMETRIC] verifyAuthenticationResponse threw error:', verifError.message, verifError);
        return res.status(401).json({ verified: false, message: 'Erro na validação criptográfica da biometria: ' + verifError.message });
    }

    if (verification && verification.verified) {
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

/**
 * Deactivate Biometrics
 */
export const deactivateBiometrics = async (req: Request, res: Response) => {
  try {
    const { clientId } = req.body;
    
    await (prisma.client as any).update({
        where: { id: clientId },
        data: {
          webauthnId: null,
          webauthnPublicKey: null,
          webauthnCounter: 0,
        },
    });

    res.json({ success: true, message: 'Biometria desativada com sucesso.' });
  } catch (error) {
    console.error('Deactivate Biometrics Error:', error);
    res.status(500).json({ message: 'Erro ao desativar biometria.' });
  }
};
