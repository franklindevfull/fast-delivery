import React from 'react';
import type { SelectedAddon, Product } from '../types';

interface AddonDisplayProps {
  addons: SelectedAddon[];
  products?: Product[];
  className?: string;
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
  showPrice = false,
  onPriceFormat
}) => {
  if (!addons || addons.length === 0) return null;

  // Group addons by groupName
  const groupedAddons: Record<string, SelectedAddon[]> = {};
  addons.forEach(addon => {
    const group = addon.groupName || 'Adicionais';
    if (!groupedAddons[group]) groupedAddons[group] = [];
    groupedAddons[group].push(addon);
  });

  return (
    <div className={`space-y-1 ${className}`}>
      {Object.entries(groupedAddons).map(([groupName, groupAddons]) => (
        <div key={groupName} className="space-y-0.5">
          <div className="text-[0.85em] font-black uppercase tracking-tight opacity-70 border-b border-current/10 mb-0.5 pb-0.5">
            {groupName}
          </div>
          {groupAddons.map((addon, idx) => {
            const linkedProduct = addon.productId ? products.find(p => p.id === addon.productId) : null;
            const displayName = addon.name;
            const totalQty = (addon.quantity || 1);

            return (
              <div key={idx} className="flex justify-between items-center gap-2 pl-1">
                <span className="leading-tight">
                  • {totalQty > 1 ? `${totalQty}x ` : ''}{displayName}
                  {linkedProduct && (
                    <span className="ml-1 opacity-60 text-[0.9em] italic font-normal">
                      ({linkedProduct.name})
                    </span>
                  )}
                </span>
                {showPrice && addon.price > 0 && onPriceFormat && (
                  <span className="shrink-0 font-normal">
                    {onPriceFormat(addon.price * totalQty)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
