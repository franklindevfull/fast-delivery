export interface AddonOption {
    id: string;
    name: string;
    price: number;
    trackStock?: boolean;
    stock?: number;
    active?: boolean;
    productId?: string;
}

export interface AddonGroup {
    id: string;
    name: string;
    type: 'SINGLE' | 'MULTIPLE';
    isRequired: boolean;
    active: boolean;
    options: AddonOption[];
}

export interface SelectedAddon {
    id?: string;
    addonOptionId: string;
    name: string;
    price: number;
    groupId?: string;
    groupName?: string;
    quantity: number;
    productId?: string;
}

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
    addonGroups?: {
        addonGroup: AddonGroup;
    }[];
}

export interface CartItem extends Product {
    cartId: string;
    quantity: number;
    pizzaFlavors?: Product[];
    observations?: string;
    selectedAddons?: SelectedAddon[];
}
