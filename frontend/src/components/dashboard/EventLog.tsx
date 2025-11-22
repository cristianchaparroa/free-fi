/**
 * EventLog Component
 *
 * Timeline-style event log displaying transaction and rebalancing history.
 * Features:
 * - Vertical timeline with connected dots
 * - Rebalancing events with impact metrics
 * - Gasless transaction badges
 * - Scrollable container with custom styling
 * - Color-coded by event type
 *
 * @example
 * ```tsx
 * <EventLog />
 * ```
 */

'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import { EventItem } from '@/types';

export const EventLog: React.FC = () => {
  const events: EventItem[] = [
    {
      time: "2h ago",
      action: "Rebalance -> Compound",
      impact: "+2.1%",
      gasless: true
    },
    {
      time: "1d ago",
      action: "Rebalance -> Morpho",
      impact: "+1.8%",
      gasless: true
    },
    {
      time: "3d ago",
      action: "Rebalance -> Aave",
      impact: "+0.9%",
      gasless: true
    },
    {
      time: "5d ago",
      action: "Deposit 5000 USDC",
      impact: "Start",
      gasless: false
    }
  ];

  return (
    <div className="space-y-6 font-mono text-sm h-64 overflow-y-auto pr-2 custom-scrollbar">
      {events.map((item, i) => (
        <div
          key={i}
          className="relative pl-4 border-l border-[#5B8FFF]/20 pb-2 last:pb-0"
        >
          {/* Timeline dot */}
          <div className="absolute -left-[3px] top-0 w-[5px] h-[5px] bg-[#5B8FFF] rounded-full"></div>

          {/* Event details */}
          <div className="text-[#5B8FFF] text-xs mb-1 opacity-70">{item.time}</div>
          <div className="text-white mb-1 text-xs font-bold">{item.action}</div>
          <div className="text-[#2DD4BF] text-xs mb-1">{item.impact}</div>

          {/* Gasless badge */}
          {item.gasless && (
            <div className="text-[#F4B944] text-[10px] flex items-center gap-1 border border-[#F4B944]/30 px-1 w-fit">
              <Zap size={8} /> GASLESS
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
