import React, { createContext, useContext, useState } from 'react';
import type { Product } from './types';

interface CartItem {
    cartId: string;
    product: Product;
    quantity: number;
    pizzaFlavors?: Product[];
    observations?: string;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (product: Product, quantity?: number, flavors?: Product[], obs?: string) => void;
    removeFromCart: (cartIdOrProductId: string) => void;
    clearCart: () => void;
    total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>([]);

    const addToCart = (product: Product, quantity = 1, flavors?: Product[], obs?: string) => {
        setItems(prev => {
            if (flavors?.length || obs) {
                return [...prev, { cartId: Math.random().toString(36).substr(2, 9), product, quantity, pizzaFlavors: flavors, observations: obs }];
            }
            const existing = prev.find(i => i.product.id === product.id && !i.pizzaFlavors?.length && !i.observations);
            if (existing) {
                return prev.map(i => i.cartId === existing.cartId ? { ...i, quantity: i.quantity + quantity } : i);
            }
            return [...prev, { cartId: Math.random().toString(36).substr(2, 9), product, quantity }];
        });
    };

    const removeFromCart = (cartIdOrProductId: string) => {
        setItems(prev => prev.reduce((acc, item) => {
            if (item.cartId === cartIdOrProductId || item.product.id === cartIdOrProductId) {
                if (item.quantity > 1 && !item.pizzaFlavors?.length && !item.observations) {
                    acc.push({ ...item, quantity: item.quantity - 1 });
                }
            } else {
                acc.push(item);
            }
            return acc;
        }, [] as CartItem[]));
    };

    const clearCart = () => setItems([]);

    const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

    return (
        <CartContext.Provider value={{ items, addToCart, removeFromCart, clearCart, total }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within a CartProvider');
    return context;
};
