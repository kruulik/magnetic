import React, { useState, useEffect } from 'react';

import { useMagnetic } from '../../src/index';
import styles from '../styles/MultiSphereDemo.module.scss';
import { generateSphereColor } from '../utils/colorUtils';

interface MultiSphereDemoProps {
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  showTooltip: boolean;
}

interface SphereData {
  id: number;
  x: number;
  y: number;
  size: number;
}

// Constants for tooltip positioning
const TOOLTIP_CONSTANTS = {
  OFFSET_X: 15,
  OFFSET_Y: 10
} as const;

// Sphere data configuration
const SPHERE_DATA: SphereData[] = [
  // Top section (0-33%)
  { id: 1, x: 15, y: 5, size: 60 },
  { id: 2, x: 85, y: 8, size: 80 },
  { id: 3, x: 25, y: 12, size: 50 },
  { id: 4, x: 70, y: 15, size: 70 },
  { id: 5, x: 10, y: 18, size: 55 },
  { id: 6, x: 90, y: 22, size: 65 },
  { id: 7, x: 45, y: 25, size: 45 },
  { id: 8, x: 60, y: 28, size: 75 },
  { id: 9, x: 30, y: 30, size: 40 },
  { id: 10, x: 80, y: 32, size: 85 },
  { id: 11, x: 5, y: 33, size: 35 },
  { id: 12, x: 95, y: 33, size: 90 },

  // Middle section (33-66%)
  { id: 13, x: 40, y: 38, size: 48 },
  { id: 14, x: 65, y: 42, size: 58 },
  { id: 15, x: 20, y: 45, size: 42 },
  { id: 16, x: 75, y: 48, size: 68 },
  { id: 17, x: 12, y: 50, size: 52 },
  { id: 18, x: 88, y: 53, size: 72 },
  { id: 19, x: 35, y: 55, size: 38 },
  { id: 20, x: 55, y: 58, size: 82 },
  { id: 21, x: 8, y: 60, size: 46 },
  { id: 22, x: 92, y: 62, size: 64 },
  { id: 23, x: 48, y: 65, size: 56 },
  { id: 24, x: 72, y: 66, size: 78 },

  // Bottom section (66-100%)
  { id: 25, x: 18, y: 70, size: 44 },
  { id: 26, x: 82, y: 73, size: 66 },
  { id: 27, x: 25, y: 75, size: 50 },
  { id: 28, x: 68, y: 78, size: 74 },
  { id: 29, x: 5, y: 80, size: 36 },
  { id: 30, x: 95, y: 82, size: 88 },
  { id: 31, x: 42, y: 85, size: 54 },
  { id: 32, x: 58, y: 87, size: 70 },
  { id: 33, x: 15, y: 90, size: 48 },
  { id: 34, x: 85, y: 92, size: 62 },
  { id: 35, x: 32, y: 95, size: 40 },
  { id: 36, x: 78, y: 98, size: 76 }
];

const InfoPanel: React.FC<{
  sphereCount: number;
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
}> = ({ sphereCount, strength, distance, duration, ease, fullWindow }) => (
  <div className={styles.infoPanel}>
    <h4 className={styles.infoPanelTitle}>Multi-Sphere Magnetic Field</h4>
    <p className={styles.infoPanelDescription}>
      36 spheres of varying sizes respond independently to your cursor movement. Scroll to explore the full 3x height field.
    </p>
    <div className={styles.infoPanelStats}>
      <div>Active spheres: {sphereCount}</div>
      <div>Magnetic strength: {strength}</div>
      <div>Field range: {fullWindow ? 'Full window' : `${distance}px`}</div>
      <div>Animation: {duration}s {ease}</div>
    </div>
  </div>
);

const Sphere: React.FC<{ 
  sphere: SphereData;
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
}> = ({ sphere, strength, distance, duration, ease, fullWindow }) => {
  const magneticRef = useMagnetic<HTMLDivElement>({
    strength,
    distance,
    duration,
    ease,
    fullWindow,
    debug: false
  });

  return (
    <div
      ref={magneticRef}
      className={styles.sphere}
      style={{
        left: `${sphere.x}%`,
        top: `${sphere.y}%`,
        width: `${sphere.size}px`,
        height: `${sphere.size}px`,
        backgroundColor: generateSphereColor(sphere.id, SPHERE_DATA.length),
      }}
    />
  );
};

const Tooltip: React.FC<{
  mousePos: { x: number; y: number };
  show: boolean;
}> = ({ mousePos, show }) => {
  if (!show) return null;

  return (
    <div 
      className={styles.tooltip}
      style={{
        left: mousePos.x + TOOLTIP_CONSTANTS.OFFSET_X,
        top: mousePos.y - TOOLTIP_CONSTANTS.OFFSET_Y,
      }}
    >
      <div>Multi-Sphere Demo</div>
      <div>Cursor: ({mousePos.x}, {mousePos.y})</div>
    </div>
  );
};

export const MultiSphereDemo: React.FC<MultiSphereDemoProps> = ({
  strength,
  distance,
  duration,
  ease,
  fullWindow,
  showTooltip
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!showTooltip) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [showTooltip]);

  return (
    <div className={styles.demoContent}>
      <InfoPanel 
        sphereCount={SPHERE_DATA.length}
        strength={strength}
        distance={distance}
        duration={duration}
        ease={ease}
        fullWindow={fullWindow}
      />
      
      <div className={styles.sphereField}>
        {SPHERE_DATA.map((sphere) => (
          <Sphere 
            key={sphere.id} 
            sphere={sphere}
            strength={strength}
            distance={distance}
            duration={duration}
            ease={ease}
            fullWindow={fullWindow}
          />
        ))}
      </div>

      <Tooltip mousePos={mousePos} show={showTooltip} />
    </div>
  );
};
