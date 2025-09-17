import React, { useState } from 'react';

import { useMagnetic } from '../../src/index';
import styles from '../styles/SingleSphereDemo.module.scss';

interface SingleSphereDemoProps {
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  showTooltip: boolean;
}

interface DebugInfo {
  distance: number;
  force: number;
  movement: number;
  effectiveDistance: number;
  active: boolean;
}

// Constants for physics calculations
const PHYSICS_CONSTANTS = {
  VIEWPORT_WIDTH: 400,
  VIEWPORT_HEIGHT: 900,
  VIEWPORT_CENTER_X: 400,
  VIEWPORT_CENTER_Y: 300,
  VIEWPORT_MAX_X: 600,
  VIEWPORT_MAX_Y: 300,
  POWER_OF_THREE: 3,
  CLOSE_DISTANCE_THRESHOLD: 3,
  DISTANCE_SCALE_FACTOR: 0.2,
  EXPONENTIAL_DIVISOR: 100,
  HALF: 2,
  TOOLTIP_OFFSET_X: 15,
  TOOLTIP_OFFSET_Y: 10,
  PHYSICS_PANEL_BASE_X: 150,
  PHYSICS_PANEL_SCALE: 0.8,
  PHYSICS_PANEL_INFO_BASE: 280,
  PHYSICS_SPHERE_SCALE: 1.5
} as const;

// Constants for test distances
const TEST_DISTANCE_VALUES = {
  LARGE: 200,
  MEDIUM: 100,
  SMALL: 50,
  TINY: 10,
  MINIMAL: 5
} as const;

// Test distances for physics demonstration
const TEST_DISTANCES = [
  TEST_DISTANCE_VALUES.LARGE,
  TEST_DISTANCE_VALUES.MEDIUM,
  TEST_DISTANCE_VALUES.SMALL,
  TEST_DISTANCE_VALUES.TINY,
  TEST_DISTANCE_VALUES.MINIMAL
] as const;

const calculateMagneticForce = (distance: number, strength: number, fullWindow: boolean, effectiveDistance: number) => {
  const normalizedDistance = distance / effectiveDistance;
  const magneticForce = Math.pow(1 - Math.min(normalizedDistance, 1), PHYSICS_CONSTANTS.POWER_OF_THREE);
  const attractionStrength = magneticForce * strength;

  let movement: number;
  if (distance > 0) {
    if (distance < PHYSICS_CONSTANTS.CLOSE_DISTANCE_THRESHOLD) {
      movement = attractionStrength * distance;
    } else {
      const baseMovement = attractionStrength * (effectiveDistance * PHYSICS_CONSTANTS.DISTANCE_SCALE_FACTOR);
      const distanceScaled = baseMovement * (1 - Math.exp(-distance / PHYSICS_CONSTANTS.EXPONENTIAL_DIVISOR));
      movement = distanceScaled;
    }
  } else {
    movement = 0;
  }

  return {
    force: magneticForce,
    attractionStrength,
    movement: movement
  };
};

const PhysicsTest: React.FC<{
  distance: number;
  strength: number;
  fullWindow: boolean;
  effectiveDistance: number;
}> = ({ distance, strength, fullWindow, effectiveDistance }) => {
  const physics = calculateMagneticForce(distance, strength, fullWindow, effectiveDistance);
  
  return (
    <div className={styles.physicsTest}>
      <div className={styles.physicsDistance}>
        Distance: {distance}px
      </div>

      <div 
        className={styles.physicsCursor}
        style={{
          left: `${PHYSICS_CONSTANTS.PHYSICS_PANEL_BASE_X + distance * PHYSICS_CONSTANTS.PHYSICS_PANEL_SCALE}px`,
        }} 
      />

      <div 
        className={styles.physicsSphere}
        style={{
          transform: `translateX(${physics.movement * PHYSICS_CONSTANTS.PHYSICS_SPHERE_SCALE}px)`,
        }} 
      />

      <div 
        className={styles.physicsInfo}
        style={{
          marginLeft: `${PHYSICS_CONSTANTS.PHYSICS_PANEL_INFO_BASE + distance * PHYSICS_CONSTANTS.PHYSICS_PANEL_SCALE}px`
        }}
      >
        Force: {physics.force.toFixed(PHYSICS_CONSTANTS.POWER_OF_THREE)} | Movement: {physics.movement.toFixed(1)}px
      </div>
    </div>
  );
};

const PhysicsPanel: React.FC<{
  strength: number;
  fullWindow: boolean;
  distance: number;
}> = ({ strength, fullWindow, distance }) => {
  const effectiveDistance = fullWindow
    ? Math.max(PHYSICS_CONSTANTS.VIEWPORT_WIDTH, PHYSICS_CONSTANTS.VIEWPORT_HEIGHT - PHYSICS_CONSTANTS.VIEWPORT_WIDTH, PHYSICS_CONSTANTS.VIEWPORT_CENTER_Y, PHYSICS_CONSTANTS.VIEWPORT_MAX_X - PHYSICS_CONSTANTS.VIEWPORT_MAX_Y)
    : distance;

  return (
    <div className={styles.physicsPanel}>
      <h4 className={styles.physicsPanelTitle}>Physics Test - Distance vs Movement</h4>
      {TEST_DISTANCES.map((dist) => (
        <PhysicsTest
          key={dist}
          distance={dist}
          strength={strength}
          fullWindow={fullWindow}
          effectiveDistance={effectiveDistance}
        />
      ))}
    </div>
  );
};

const Tooltip: React.FC<{
  mousePos: { x: number; y: number };
  debugInfo: DebugInfo | null;
  show: boolean;
}> = ({ mousePos, debugInfo, show }) => {
  if (!show || !debugInfo) return null;

  return (
    <div 
      className={`${styles.tooltip} ${!debugInfo.active ? styles.inactive : ''}`}
      style={{
        left: mousePos.x + PHYSICS_CONSTANTS.TOOLTIP_OFFSET_X,
        top: mousePos.y - PHYSICS_CONSTANTS.TOOLTIP_OFFSET_Y,
      }}
    >
      <div className={styles.tooltipDistance}>Distance: <strong>{debugInfo.distance.toFixed(1)}px</strong></div>
      <div className={styles.tooltipDistance}>Effective: <strong>{debugInfo.effectiveDistance.toFixed(0)}px</strong></div>
      <div className={styles.tooltipDistance}>Force: <strong>{debugInfo.force.toFixed(PHYSICS_CONSTANTS.POWER_OF_THREE)}</strong></div>
      <div className={styles.tooltipDistance}>Movement: <strong>{debugInfo.movement.toFixed(1)}px</strong></div>
      <div className={styles.tooltipStatus}>
        {debugInfo.active ? '✓ ACTIVE' : '✗ INACTIVE'}
      </div>
    </div>
  );
};

const calculateCursorDistance = (mouseX: number, mouseY: number, rect: DOMRect): number => {
  const centerX = rect.left + rect.width / PHYSICS_CONSTANTS.HALF;
  const centerY = rect.top + rect.height / PHYSICS_CONSTANTS.HALF;
  
  return Math.sqrt(
    Math.pow(mouseX - centerX, PHYSICS_CONSTANTS.HALF) + Math.pow(mouseY - centerY, PHYSICS_CONSTANTS.HALF)
  );
};

const calculateEffectiveDistance = (rect: DOMRect, distance: number, fullWindow: boolean): number => {
  if (!fullWindow) return distance;
  
  const centerX = rect.left + rect.width / PHYSICS_CONSTANTS.HALF;
  const centerY = rect.top + rect.height / PHYSICS_CONSTANTS.HALF;
  
  return Math.max(centerX, window.innerWidth - centerX, centerY, window.innerHeight - centerY);
};

const calculateMovement = (cursorDistance: number, attractionStrength: number, effectiveDistance: number): number => {
  if (cursorDistance <= 0) return 0;
  
  if (cursorDistance < PHYSICS_CONSTANTS.CLOSE_DISTANCE_THRESHOLD) {
    return attractionStrength * cursorDistance;
  }
  
  const baseMovement = attractionStrength * (effectiveDistance * PHYSICS_CONSTANTS.DISTANCE_SCALE_FACTOR);
  return baseMovement * (1 - Math.exp(-cursorDistance / PHYSICS_CONSTANTS.EXPONENTIAL_DIVISOR));
};

const calculateDebugInfo = (params: {
  mouseX: number;
  mouseY: number;
  sphereElement: HTMLDivElement;
  strength: number;
  distance: number;
  fullWindow: boolean;
}): DebugInfo => {
  const { mouseX, mouseY, sphereElement, strength, distance, fullWindow } = params;
  const rect = sphereElement.getBoundingClientRect();
  
  const cursorDistance = calculateCursorDistance(mouseX, mouseY, rect);
  const effectiveDistance = calculateEffectiveDistance(rect, distance, fullWindow);
  
  const normalizedDistance = cursorDistance / effectiveDistance;
  const magneticForce = Math.pow(1 - Math.min(normalizedDistance, 1), PHYSICS_CONSTANTS.POWER_OF_THREE);
  const attractionStrength = magneticForce * strength;
  
  const movement = calculateMovement(cursorDistance, attractionStrength, effectiveDistance);
  const isActive = fullWindow || cursorDistance < distance;

  return {
    distance: cursorDistance,
    force: magneticForce,
    movement,
    effectiveDistance,
    active: isActive
  };
};

export const SingleSphereDemo: React.FC<SingleSphereDemoProps> = ({
  strength,
  distance,
  duration,
  ease,
  fullWindow,
  showTooltip
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  const magneticRef = useMagnetic<HTMLDivElement>({
    strength,
    distance,
    duration,
    ease,
    fullWindow,
    debug: false
  });

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    const sphereElement = magneticRef.current;
    if (sphereElement) {
      const newDebugInfo = calculateDebugInfo({
        mouseX: e.clientX,
        mouseY: e.clientY,
        sphereElement,
        strength,
        distance,
        fullWindow
      });
      setDebugInfo(newDebugInfo);
    }
  };

  return (
    <div className={styles.demoContent} onMouseMove={handleMouseMove}>
      <div className={styles.sphereContainer}>
        <div
          ref={magneticRef}
          className={styles.sphere}
        />

        <PhysicsPanel 
          strength={strength}
          fullWindow={fullWindow}
          distance={distance}
        />
      </div>

      <Tooltip 
        mousePos={mousePos}
        debugInfo={debugInfo}
        show={showTooltip}
      />
    </div>
  );
};
