import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './views/Home';
import Login from './views/Login';
import Register from './views/Register';
import Checkout from './views/Checkout';
import OrderHistory from './views/OrderHistory';
import OrderDetails from './views/OrderDetails';
import RecoverPassword from './views/RecoverPassword';
import Profile from './views/Profile';
import Chat from './views/Chat';
import { CartProvider } from './CartContext';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import SplashScreen from './components/SplashScreen';
import { api } from './services/api';
import { isMobile } from './utils/device';
import CustomAlert from './components/CustomAlert';

function App() {
    const [isSplashVisible, setIsSplashVisible] = useState(true);
    const [needsBiometricValidation, setNeedsBiometricValidation] = useState(false);
    const [isValidatingFocus, setIsValidatingFocus] = useState(false);
    const [alertState, setAlertState] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'INFO' as 'INFO' | 'DANGER' | 'SUCCESS',
        onConfirm: () => { },
    });

    const checkAutoLogout = () => {
        const loginTimeStr = localStorage.getItem('delivery_app_login_time');
        if (loginTimeStr) {
            const loginTime = parseInt(loginTimeStr, 10);
            const now = Date.now();
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
            
            if (now - loginTime > sevenDaysInMs) {
                api.logout();
                window.location.href = '/login';
                return true;
            }
        }
        return false;
    };

    const handleBiometricFocusValidation = async () => {
        const lastPhone = localStorage.getItem('delivery_app_last_phone');
        if (!lastPhone) return;

        try {
            setIsValidatingFocus(true);
            const cleanPhone = lastPhone.replace(/\D/g, '');
            const options = await api.getBiometricLoginOptions(cleanPhone);
            
            const { startAuthentication } = await import('@simplewebauthn/browser');
            const credential = await startAuthentication({ optionsJSON: options });
            
            await api.verifyBiometricLogin(cleanPhone, credential);
            setNeedsBiometricValidation(false);
        } catch (err: any) {
            console.error('Focus Biometric Error:', err);
            
            let errorMessage = 'Não foi possível validar biometria ao retornar ao app.';
            if (err.name === 'NotAllowedError') {
                errorMessage = 'Validação biométrica cancelada. Por segurança, você foi desconectado.';
            } else {
                errorMessage = `${errorMessage} Por segurança, você foi desconectado.`;
            }

            setAlertState({
                isOpen: true,
                title: 'Sessão Expirada',
                message: errorMessage,
                type: 'INFO',
                onConfirm: () => {
                    api.logout();
                    window.location.href = '/login';
                }
            });
        } finally {
            setIsValidatingFocus(false);
        }
    };

    useEffect(() => {
        // Run auto-logout check on initial load
        if (checkAutoLogout()) return;

        const timer = setTimeout(() => {
            setIsSplashVisible(false);
            
            // Check if we need biometric validation on initial startup if they are already logged in
            const token = localStorage.getItem('delivery_app_token');
            const lastPhone = localStorage.getItem('delivery_app_last_phone');
            if (token && lastPhone && isMobile()) {
                const biometricEnabled = localStorage.getItem(`biometric_enabled_${lastPhone}`);
                if (biometricEnabled === 'true') {
                    setNeedsBiometricValidation(true);
                }
            }
        }, 3000);

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                if (checkAutoLogout()) return;

                const token = localStorage.getItem('delivery_app_token');
                const lastPhone = localStorage.getItem('delivery_app_last_phone');
                if (!token || !lastPhone || !isMobile() || isSplashVisible) return;

                const biometricEnabled = localStorage.getItem(`biometric_enabled_${lastPhone}`);
                if (biometricEnabled === 'true') {
                    setNeedsBiometricValidation(true);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    if (isSplashVisible) {
        return <SplashScreen />;
    }

    if (needsBiometricValidation) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
                <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-3xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" />
                    </svg>
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter mb-2">Bem-vindo de volta</h2>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-8 max-w-xs">
                    Clique no botão abaixo para o seu celular abrir o leitor de biometria nativo.
                </p>
                <button
                    onClick={handleBiometricFocusValidation}
                    disabled={isValidatingFocus}
                    className="w-full max-w-sm bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 dark:shadow-none active:scale-95 flex items-center justify-center gap-3 mb-4"
                >
                    {isValidatingFocus ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        'ENTRAR COM BIOMETRIA'
                    )}
                </button>
                <button
                    onClick={() => {
                        api.logout();
                        window.location.href = '/login';
                    }}
                    disabled={isValidatingFocus}
                    className="w-full max-w-sm bg-transparent hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95"
                >
                    Entrar com Senha
                </button>
            </div>
        );
    }

    return (
        <CartProvider>
            <BrowserRouter>
                <Layout>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/recover" element={<RecoverPassword />} />
                        <Route path="/register" element={<Register />} />

                        {/* Protected Routes */}
                        <Route path="/" element={<AuthGuard><Home /></AuthGuard>} />
                        <Route path="/checkout" element={<AuthGuard><Checkout /></AuthGuard>} />
                        <Route path="/history" element={<AuthGuard><OrderHistory /></AuthGuard>} />
                        <Route path="/order/:id" element={<AuthGuard><OrderDetails /></AuthGuard>} />
                        <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
                        <Route path="/chat" element={<AuthGuard><Chat /></AuthGuard>} />
                        
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Layout>
            </BrowserRouter>

            <CustomAlert
                isOpen={alertState.isOpen}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onConfirm={alertState.onConfirm}
            />
        </CartProvider>
    );
}

export default App;
