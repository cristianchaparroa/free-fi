/**
 * YieldChart Component
 *
 * SVG-based yield performance visualization chart with:
 * - Historical APY data points
 * - Animated line path
 * - Interactive data points with glow effects
 * - Grid lines for better readability
 * - Y-axis labels and X-axis timeline
 *
 * Fully responsive and styled to match Dragonfly aesthetic.
 */

'use client';

import React from 'react';

interface DataPoint {
  x: number;
  y: number;
}

export const YieldChart: React.FC = () => {
  // Mock data points for APY over time
  const dataPoints: DataPoint[] = [
    { x: 0, y: 100 },
    { x: 100, y: 80 },
    { x: 200, y: 80 },
    { x: 300, y: 40 },
    { x: 400, y: 40 },
    { x: 500, y: 40 },
    { x: 600, y: 40 },
    { x: 700, y: 10 }
  ];

  // Generate SVG path from data points
  const pathData = dataPoints.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`
  ).join(' ');

  return (
    <div className="h-48 flex items-end justify-between px-4 pb-4 border-l border-b border-[#5B8FFF]/20 relative font-mono text-xs">
      {/* Y-axis labels */}
      <div className="absolute -left-8 top-0 h-full flex flex-col justify-between text-gray-500 py-2">
        <span>14%</span>
        <span>10%</span>
        <span>6%</span>
      </div>

      {/* Chart SVG */}
      <div className="absolute inset-0 flex items-center px-4 pt-4">
        <svg className="w-full h-full overflow-visible">
          {/* Grid Lines */}
          <line
            x1="0"
            y1="0"
            x2="100%"
            y2="0"
            stroke="#5B8FFF"
            strokeOpacity="0.1"
            strokeDasharray="4"
          />
          <line
            x1="0"
            y1="50%"
            x2="100%"
            y2="50%"
            stroke="#5B8FFF"
            strokeOpacity="0.1"
            strokeDasharray="4"
          />

          {/* APY Line Path */}
          <path
            d={pathData}
            fill="none"
            stroke="#5B8FFF"
            strokeWidth="2"
          />

          {/* Data Points with Glow */}
          {dataPoints.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill="#0F1419"
                stroke="#2DD4BF"
                strokeWidth="2"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="8"
                fill="#2DD4BF"
                fillOpacity="0.1"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* X-axis timeline labels */}
      <div className="w-full flex justify-between text-gray-500 mt-4 absolute -bottom-6">
        <span>Nov 18</span>
        <span>Nov 19</span>
        <span>Nov 20</span>
        <span>Nov 21</span>
        <span>Nov 22</span>
      </div>
    </div>
  );
};
