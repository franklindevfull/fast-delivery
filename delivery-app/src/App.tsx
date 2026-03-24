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
    const [isValidatingFocus, setIsValidatingFocus] = useState(false);
    const [alertState, setAlertState] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'INFO' as 'INFO' | 'DANGER' | 'SUCCESS',
        onConfirm: () => { },
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsSplashVisible(false);
        }, 3000);

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                const token = localStorage.getItem('delivery_app_token');
                const lastPhone = localStorage.getItem('delivery_app_last_phone');
                if (!token || !lastPhone || !isMobile()) return;

                const biometricEnabled = localStorage.getItem(`biometric_enabled_${lastPhone}`);
                if (biometricEnabled === 'true') {
                    try {
                        setIsValidatingFocus(true);
                        const cleanPhone = lastPhone.replace(/\D/g, '');
                        const options = await api.getBiometricLoginOptions(cleanPhone);
                        
                        const { startAuthentication } = await import('@simplewebauthn/browser');
                        const credential = await startAuthentication({ optionsJSON: options });
                        
                        await api.verifyBiometricLogin(cleanPhone, credential);
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

    if (isValidatingFocus) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-center justify-center">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center">
                    <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-sm">
                        Validando Biometria...
                    </p>
                </div>
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
