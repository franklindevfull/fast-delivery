import { Client } from '../types';
import { toTitleCase } from './validationUtils';

/**
 * Formats a client's structured address into a single string for display or printing.
 */
export const formatAddress = (client: Client | any): string => {
    if (!client) return 'Nenhum endereço';

    const { street, addressNumber, complement, neighborhood, city, state, cep } = client;

    if (!street && (!client.addresses || client.addresses.length === 0)) {
        return 'Endereço não informado';
    }

    // Fallback to legacy address array if structured fields are missing
    if (!street && client.addresses && client.addresses.length > 0) {
        return client.addresses[0];
    }

    const parts = [];
    if (street) parts.push(toTitleCase(street));
    if (addressNumber) parts.push(addressNumber);
    if (complement) parts.push(complement);

    let mainLine = parts.join(', ');

    const secondLineParts = [];
    if (neighborhood) secondLineParts.push(toTitleCase(neighborhood));
    if (city) secondLineParts.push(toTitleCase(city));
    if (state) secondLineParts.push(state.toUpperCase());

    const secondLine = secondLineParts.join(', ');

    let full = mainLine;
    if (secondLine) full += ` - ${secondLine}`;
    if (cep) full += ` (CEP: ${cep})`;
    return full;
};

/**
 * Formats a number as Brazilian Real (pt-BR)
 * @param value The numeric value to format
 * @param showSymbol Whether to include the "R$ " prefix
 */
export const formatCurrency = (value: number, showSymbol = true): string => {
    const formatted = new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value || 0);

    return showSymbol ? `R$ ${formatted}` : formatted;
};

/**
 * Normalizes a neighborhood name for comparison purposes.
 * Removes accents, spaces, and converts to lowercase.
 */
export const normalizeNeighborhood = (name: string): string => {
    if (!name) return '';
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, '');
};
