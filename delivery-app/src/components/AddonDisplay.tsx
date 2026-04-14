import React from 'react';
import { SelectedAddon, Product } from '../types';

interface AddonDisplayProps {
  addons: SelectedAddon[];
  products?: Product[];
  className?: string;
  itemQuantity?: number;
  showPrice?: boolean;
  onPriceFormat?: (price: number) => string;
}

/**
 * Standardized component to display addons across all modules.
 * Handles display of linked products if necessary.
 */
export const AddonDisplay: React.FC<AddonDisplayProps> = ({ 
  addons, 
  products = [], 
  className = "", 
  itemQuantity = 1,
  showPrice = false,
  onPriceFormat
}) => {
  if (!addons || addons.length === 0) return null;

  return (
    <div className={`space-y-0.5 ${className}`}>
      {addons.map((addon, idx) => {
        // Find if this is a linked product
        const linkedProduct = addon.productId ? products.find(p => p.id === addon.productId) : null;
        const displayName = addon.name;
        const totalQty = (addon.quantity || 1) * itemQuantity;

        return (
          <div key={idx} className="flex justify-between items-center gap-2">
            <span className="leading-tight">
              + {addon.quantity > 1 ? `${addon.quantity}x ` : ''}{displayName}
              {linkedProduct && (
                <span className="ml-1 opacity-60 text-[0.9em] italic">
                  ({linkedProduct.name})
                </span>
              )}
            </span>
            {showPrice && addon.price > 0 && onPriceFormat && (
              <span className="shrink-0">
                {onPriceFormat(addon.price * addon.quantity)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};
