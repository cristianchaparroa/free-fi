/**
 * Badge Component
 *
 * Status badge component for displaying protocol states (BEST, GASLESS, etc.)
 * Supports three color variants: brand (blue), success (turquoise), warning (gold)
 *
 * @example
 * ```tsx
 * <Badge text="BEST" type="success" />
 * <Badge text="GASLESS" type="warning" />
 * ```
 */

import React from 'react';
import { BadgeProps, BadgeType } from '@/types';

export const Badge: React.FC<BadgeProps> = ({ text, type = 'brand' }) => {
  const colorMap: Record<BadgeType, string> = {
    brand: 'text-[#5B8FFF] border-[#5B8FFF]',
    success: 'text-[#2DD4BF] border-[#2DD4BF]',
    warning: 'text-[#F4B944] border-[#F4B944]'
  };

  return (
    <span
      className={`text-[10px] font-mono uppercase px-2 py-0.5 border ${colorMap[type]} bg-opacity-10 bg-black`}
    >
      {text}
    </span>
  );
};
