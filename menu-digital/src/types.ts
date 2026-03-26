export interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    imageUrl: string;
    maxAvailability?: number;
}

export interface CartItem extends Product {
    quantity: number;
}
