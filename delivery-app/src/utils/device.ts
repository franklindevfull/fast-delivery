/**
 * Utility to identify if the user is on a mobile device (Android or iOS)
 */
export const isMobile = (): boolean => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    
    // Check for iOS
    if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
        return true;
    }
    
    // Check for Android
    if (/android/i.test(userAgent)) {
        return true;
    }
    
    return false;
};
