import { Router } from 'express';
import { loginClient, registerClient, recoverPassword, updateClientProfile, googleLoginClient, checkPhoneAvailability, checkGoogleAccount, getClientNotifications } from '../controllers/clientAuthController.js';
import { getRegistrationOptions, verifyRegistration, getLoginOptions, verifyLogin, deactivateBiometrics } from '../controllers/biometricController.js';

const router = Router();

router.post('/login', loginClient);
router.post('/google', googleLoginClient);
router.post('/register', registerClient);
router.post('/recover', recoverPassword);
router.put('/profile/:id', updateClientProfile);
router.get('/check-phone/:phone', checkPhoneAvailability);
router.get('/check-google-account', checkGoogleAccount);
router.get('/:id/notifications', getClientNotifications);

// Biometric Auth
router.post('/biometric/register-options', getRegistrationOptions);
router.post('/biometric/register-verify', verifyRegistration);
router.post('/biometric/login-options', getLoginOptions);
router.post('/biometric/login-verify', verifyLogin);
router.post('/biometric/deactivate', deactivateBiometrics);

export default router;
