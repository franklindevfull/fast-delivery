export const calculateMaxAvailability = (product: any): number => {
    if ((!product.recipe || product.recipe.length === 0) && (!product.comboItems || product.comboItems.length === 0)) {
        return product.stock || 0;
    }

    let minAvailability = Infinity;

    if (product.recipe && product.recipe.length > 0) {
        for (const r of product.recipe) {
            if (!r.inventoryItem) continue;
            let reqQty = parseFloat(r.quantity?.toString() || '0');
            const wf = parseFloat(r.wasteFactor?.toString() || '1');
            
            const unitType = r.inventoryItem.unit;
            if (unitType === 'KG' || unitType === 'L') {
                reqQty = reqQty / 1000;
            }

            const totalReq = reqQty * wf;
            if (totalReq > 0) {
                const availableForThisIngredient = Math.floor((r.inventoryItem.quantity || 0) / totalReq);
                if (availableForThisIngredient < minAvailability) {
                    minAvailability = availableForThisIngredient;
                }
            }
        }
    }

    if (product.comboItems && product.comboItems.length > 0) {
        for (const c of product.comboItems) {
            if (!c.product) continue;
            const subAvailability = calculateMaxAvailability(c.product);
            const reqQty = c.quantity || 1;
            const availableForThisComboItem = Math.floor(subAvailability / reqQty);
            if (availableForThisComboItem < minAvailability) {
                minAvailability = availableForThisComboItem;
            }
        }
    }

    return minAvailability === Infinity ? 0 : Math.max(0, minAvailability);
};
