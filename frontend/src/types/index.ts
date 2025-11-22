/**
 * Type definitions for FreeFi application
 */

/**
 * Theme color palette for the application
 */
export interface Theme {
  bg: string;
  surface: string;
  brand: string;
  success: string;
  warning: string;
  text: string;
  textDim: string;
  border: string;
  grid: string;
}

/**
 * Market rate data for DeFi protocols
 */
export interface RateData {
  name: string;
  apy: string;
  best: boolean;
}

/**
 * Event log item for transaction history
 */
export interface EventItem {
  time: string;
  action: string;
  impact: string;
  gasless: boolean;
}

/**
 * Feature card data for landing page
 */
export interface FeatureCard {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  desc: string;
  color: string;
}

/**
 * Globe point data for 3D crypto globe visualization
 */
export interface GlobePoint {
  x: number;
  y: number;
  z: number;
  char: string;
}

/**
 * Badge component type variants
 */
export type BadgeType = 'brand' | 'success' | 'warning';

/**
 * Props for BracketBox component
 */
export interface BracketBoxProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerRight?: React.ReactNode;
}

/**
 * Props for Badge component
 */
export interface BadgeProps {
  text: string;
  type?: BadgeType;
}
