export interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    imageUrl: string;
    maxAvailability?: number;
    isPizza?: boolean;
    pizzaSize?: string;
    showInMenu?: boolean;
    isFeatured?: boolean;
}

export interface CartItem extends Product {
    cartId: string;
    quantity: number;
    pizzaFlavors?: Product[];
    observations?: string;
}
