/**
 * CryptoGlobe Component
 *
 * An animated 3D globe visualization using HTML5 Canvas featuring:
 * - Fibonacci sphere distribution for uniform symbol placement
 * - Rotating crypto symbols (Ξ for Ethereum, $ for USDC, % for Yield, + for generic)
 * - ASCII art logos floating in background (ETH and USDC)
 * - Orbital data stream ring animation
 * - 3D perspective with depth sorting and culling
 *
 * Performance optimized with requestAnimationFrame and proper cleanup.
 */

'use client';

import React, { useEffect, useRef } from 'react';
import { GlobePoint, Theme } from '@/types';

interface CryptoGlobeProps {
  theme: Theme;
}

export const CryptoGlobe: React.FC<CryptoGlobeProps> = ({ theme }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    // ASCII Art Logos
    const ethAscii = [
      "   /\\   ",
      "  /  \\  ",
      " /    \\ ",
      "/______\\",
      "\\      /",
      " \\    / ",
      "  \\  /  ",
      "   \\/   "
    ];

    const usdcAscii = [
      "  $$  ",
      " $  $ ",
      "$ $ $",
      "$    $",
      "$ $ $",
      " $  $ ",
      "  $$  "
    ];

    // Generate Fibonacci Sphere points for uniform distribution
    const globePoints: GlobePoint[] = [];
    const numPoints = 450;
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

    for (let i = 0; i < numPoints; i++) {
      const y = 1 - (i / (numPoints - 1)) * 2; // y from 1 to -1
      const radius = Math.sqrt(1 - y * y);
      const theta = phi * i;

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      // Assign crypto symbols based on random distribution
      let char = '';
      const rand = Math.random();
      if (rand > 0.7) char = 'Ξ';      // Ethereum
      else if (rand > 0.4) char = '$'; // USDC
      else if (rand > 0.2) char = '%'; // Yield
      else char = '+';                  // Generic

      globePoints.push({ x, y, z, char });
    }

    const render = () => {
      time += 0.004;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const globeRadius = Math.min(canvas.width, canvas.height) * 0.35;

      // 1. Draw floating ASCII logos (background layer with parallax)
      const floatY = Math.sin(time) * 20;

      // Ethereum logo (left side)
      ctx.fillStyle = theme.brand;
      ctx.globalAlpha = 0.05;
      ethAscii.forEach((line, i) => {
        const size = 20;
        ctx.font = `bold ${size}px monospace`;
        ctx.fillText(line, cx - 400, cy - 100 + (i * size * 1.2) + floatY);
      });

      // USDC logo (right side)
      ctx.fillStyle = theme.success;
      usdcAscii.forEach((line, i) => {
        const size = 20;
        ctx.font = `bold ${size}px monospace`;
        ctx.fillText(line, cx + 400, cy + 100 + (i * size * 1.2) - floatY);
      });

      // 2. Draw rotating globe symbols
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Rotate points and apply 3D transformations
      const rotatedPoints = globePoints.map(p => {
        // Rotation around Y axis
        const ang = time * 0.8;
        const x1 = p.x * Math.cos(ang) - p.z * Math.sin(ang);
        const z1 = p.z * Math.cos(ang) + p.x * Math.sin(ang);

        // Slight tilt on X axis for better perspective
        const tilt = 0.3;
        const y2 = p.y * Math.cos(tilt) - z1 * Math.sin(tilt);
        const z2 = z1 * Math.cos(tilt) + p.y * Math.sin(tilt);

        return { ...p, x: x1, y: y2, z: z2 };
      });

      // Sort by Z for proper occlusion
      rotatedPoints.sort((a, b) => a.z - b.z);

      rotatedPoints.forEach(p => {
        // Perspective scale and alpha based on depth
        const scale = (p.z + 2) / 2;
        const size = 12 * scale;
        const alpha = (p.z + 1) / 2;

        // Backface culling
        if (p.z > -0.8) {
          const screenX = cx + p.x * globeRadius;
          const screenY = cy + p.y * globeRadius;

          ctx.font = `bold ${size}px monospace`;

          // Color coding by symbol type
          if (p.char === 'Ξ') {
            ctx.fillStyle = theme.brand;
            // Occasional glow effect
            if (Math.random() > 0.95) {
              ctx.shadowBlur = 10;
              ctx.shadowColor = theme.brand;
            } else {
              ctx.shadowBlur = 0;
            }
          } else if (p.char === '$') {
            ctx.fillStyle = theme.success;
            if (Math.random() > 0.95) {
              ctx.shadowBlur = 10;
              ctx.shadowColor = theme.success;
            } else {
              ctx.shadowBlur = 0;
            }
          } else {
            ctx.fillStyle = theme.textDim;
            ctx.shadowBlur = 0;
          }

          ctx.globalAlpha = Math.max(0.1, alpha);
          ctx.fillText(p.char, screenX, screenY);
        }
      });

      // Reset shadow
      ctx.shadowBlur = 0;

      // 3. Draw orbital data stream ring
      const ringRadius = globeRadius * 1.4;
      const ringChars = "  0x  BRIDGE  SAVINGS  YIELD  OPTIMIZE  GASLESS  ";
      const ringSpeed = time * 0.5;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.2); // Ring inclination

      for (let i = 0; i < ringChars.length; i++) {
        const char = ringChars[i];
        const angle = (i / ringChars.length) * Math.PI * 2 + ringSpeed;

        const rx = Math.cos(angle) * ringRadius;
        const ry = Math.sin(angle) * (ringRadius * 0.3); // Flattened for 3D effect
        const rz = Math.sin(angle);

        // Only render front half of ring
        if (rz > 0) {
          ctx.fillStyle = theme.warning;
          ctx.font = '10px monospace';
          ctx.globalAlpha = 0.8;
          ctx.fillText(char, rx, ry);
        }
      }

      ctx.restore();

      animationFrameId = window.requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.85 }}
    />
  );
};
