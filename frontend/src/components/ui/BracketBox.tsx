/**
 * BracketBox Component
 *
 * A wireframe-styled container component with bracket corners inspired by Dragonfly design.
 * Features corner brackets, border effects, and backdrop blur for modern DeFi aesthetic.
 *
 * @example
 * ```tsx
 * <BracketBox title="PORTFOLIO STATUS">
 *   <div>Your content here</div>
 * </BracketBox>
 * ```
 */

import React from 'react';
import { BracketBoxProps } from '@/types';

export const BracketBox: React.FC<BracketBoxProps> = ({
  title,
  children,
  className = "",
  headerRight = null
}) => {
  return (
    <div className={`relative p-1 ${className}`}>
      {/* Corner Brackets - Wireframe style */}
      {/* Top Left */}
      <div className="absolute top-0 left-0 w-2 h-[1px] bg-[#5B8FFF]"></div>
      <div className="absolute top-0 left-0 w-[1px] h-2 bg-[#5B8FFF]"></div>

      {/* Top Right */}
      <div className="absolute top-0 right-0 w-2 h-[1px] bg-[#5B8FFF]"></div>
      <div className="absolute top-0 right-0 w-[1px] h-2 bg-[#5B8FFF]"></div>

      {/* Bottom Left */}
      <div className="absolute bottom-0 left-0 w-2 h-[1px] bg-[#5B8FFF]"></div>
      <div className="absolute bottom-0 left-0 w-[1px] h-2 bg-[#5B8FFF]"></div>

      {/* Bottom Right */}
      <div className="absolute bottom-0 right-0 w-2 h-[1px] bg-[#5B8FFF]"></div>
      <div className="absolute bottom-0 right-0 w-[1px] h-2 bg-[#5B8FFF]"></div>

      {/* Subtle border overlay */}
      <div className="absolute inset-0 border border-[#5B8FFF] opacity-10 pointer-events-none"></div>

      {/* Content container with backdrop blur */}
      <div className="bg-[#0F1419]/90 backdrop-blur-md p-5 h-full relative z-10">
        {title && (
          <div className="flex justify-between items-start mb-6 border-b border-[#5B8FFF]/20 pb-2">
            <h3 className="text-[#5B8FFF] font-mono text-sm uppercase tracking-widest flex items-center gap-2">
              <span className="text-xs opacity-50">├</span> {title}
            </h3>
            {headerRight}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
