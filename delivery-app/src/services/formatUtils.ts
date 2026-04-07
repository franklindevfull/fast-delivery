/**
 * Formats a client's structured address into a single string for display or printing.
 */
export const formatAddress = (client: any): string => {
    if (!client) return 'Nenhum endereço';

    const { street, addressNumber, number, complement, neighborhood, city, state, cep } = client;
    const finalNumber = addressNumber || number;

    const parts = [];
    if (street) parts.push(street);
    if (finalNumber) parts.push(finalNumber);
    if (complement) parts.push(complement);

    let mainLine = parts.join(', ');

    const secondLineParts = [];
    if (neighborhood) secondLineParts.push(neighborhood);
    if (city) secondLineParts.push(city);
    if (state) secondLineParts.push(state.toUpperCase());

    const secondLine = secondLineParts.join(', ');

    let full = mainLine;
    if (secondLine) full += ` - ${secondLine}`;
    if (cep) full += ` (CEP: ${cep})`;
    return full;
};

/**
 * Formats a number as a Brazilian currency string (BRL / R$).
 * @param value The numeric value to format.
 * @param showSymbol Whether to include the 'R$' symbol (default: true).
 * @returns A formatted currency string.
 */
export const formatCurrency = (value: number, showSymbol = true): string => {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0);

  return showSymbol ? `R$ ${formatted}` : formatted;
};
