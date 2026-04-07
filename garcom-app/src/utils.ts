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
