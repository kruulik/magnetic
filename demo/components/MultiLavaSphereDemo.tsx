import React from 'react';

import styles from '../styles/MultiLavaSphereDemo.module.scss';
import { generateVariedSphereColor } from '../utils/colorUtils';

import { LavaSphereDemo } from './LavaSphereDemo';

interface MultiLavaSphereDemoProps {
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  showTooltip: boolean;
}

// Constants for sphere configuration
const SPHERE_CONSTANTS = {
  TOTAL_SPHERES: 39,
  BASE_RADIUS: 80,
  RADIUS_VARIATION_STEP: 5,
  RADIUS_VARIATION_MODULO: 8,
  WRAPPER_SIZE: 200,
  NUM_POINTS: 68,
  BASE_ATTRACTION_MULTIPLIER: 30,
  BASE_RADIUS_REFERENCE: 150,
  POINTINESS_FACTOR: 0.5,
  BASE_MIN_DISTANCE: 20,
  BASE_SURFACE_BUFFER: 60,
  STRETCH_FACTOR: 0.6,
  POINTINESS_MULTIPLIER: 1.2,
  SMOOTHING_FACTOR: 0.4,
  DAMPENING_POWER: 0.6,
  FORCE_CURVE_EXPONENT: 2.5,
  MIN_DAMPENING_FACTOR: 0.15,
  BASE_PERCEIVED_CURSOR_OFFSET: 30
} as const;

const createSphereConfig = (index: number) => ({
  baseRadius: SPHERE_CONSTANTS.BASE_RADIUS + (index % SPHERE_CONSTANTS.RADIUS_VARIATION_MODULO) * SPHERE_CONSTANTS.RADIUS_VARIATION_STEP,
  color: generateVariedSphereColor(index + 1)
});

const calculateScaledValue = (baseValue: number, radius: number): number => 
  baseValue * (radius / SPHERE_CONSTANTS.BASE_RADIUS_REFERENCE);

const InfoPanel: React.FC<{
  sphereCount: number;
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
}> = ({ sphereCount, strength, distance, duration, ease, fullWindow }) => (
  <div className={styles.infoPanel}>
    <h4 className={styles.infoPanelTitle}>Multi-Lava Sphere Field</h4>
    <p className={styles.infoPanelDescription}>
      39 ferrofluid-like spheres arranged in a 3x13 grid morph and stretch toward your cursor using magnetic physics. Each sphere responds independently with realistic lava-like deformation. Scroll to see position updates.
    </p>
    <div className={styles.infoPanelStats}>
      <div>Active spheres: {sphereCount}</div>
      <div>Magnetic strength: {strength}</div>
      <div>Field range: {fullWindow ? 'Full window' : `${distance}px`}</div>
      <div>Animation: {duration}s {ease}</div>
    </div>
  </div>
);

const SphereWrapper: React.FC<{
  config: { baseRadius: number; color: string };
  index: number;
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  showTooltip: boolean;
}> = ({ config, index, strength, distance, duration, ease, fullWindow, showTooltip }) => (
  <div 
    key={`sphere-${index + 1}`}
    className={styles.sphereWrapper}
    style={{
      '--sphere-color': config.color,
    } as React.CSSProperties}
  >
    <div 
      style={{
        width: `${SPHERE_CONSTANTS.WRAPPER_SIZE}px`,
        height: `${SPHERE_CONSTANTS.WRAPPER_SIZE}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <LavaSphereDemo
        strength={strength}
        distance={distance}
        duration={duration}
        ease={ease}
        fullWindow={fullWindow}
        showTooltip={showTooltip}
        numPoints={SPHERE_CONSTANTS.NUM_POINTS}
        attractionMultiplier={calculateScaledValue(SPHERE_CONSTANTS.BASE_ATTRACTION_MULTIPLIER, config.baseRadius)}
        pointinessFactor={SPHERE_CONSTANTS.POINTINESS_FACTOR}
        minDistance={calculateScaledValue(SPHERE_CONSTANTS.BASE_MIN_DISTANCE, config.baseRadius)}
        surfaceBuffer={calculateScaledValue(SPHERE_CONSTANTS.BASE_SURFACE_BUFFER, config.baseRadius)}
        stretchFactor={SPHERE_CONSTANTS.STRETCH_FACTOR}
        pointinessMultiplier={SPHERE_CONSTANTS.POINTINESS_MULTIPLIER}
        smoothingFactor={SPHERE_CONSTANTS.SMOOTHING_FACTOR}
        dampeningPower={SPHERE_CONSTANTS.DAMPENING_POWER}
        forceCurveExponent={SPHERE_CONSTANTS.FORCE_CURVE_EXPONENT}
        minDampeningFactor={SPHERE_CONSTANTS.MIN_DAMPENING_FACTOR}
        perceivedCursorOffset={calculateScaledValue(SPHERE_CONSTANTS.BASE_PERCEIVED_CURSOR_OFFSET, config.baseRadius)}
      />
    </div>
  </div>
);

export const MultiLavaSphereDemo: React.FC<MultiLavaSphereDemoProps> = ({
  strength,
  distance,
  duration,
  ease,
  fullWindow,
  showTooltip
}) => {
  const sphereConfigs = Array.from({ length: SPHERE_CONSTANTS.TOTAL_SPHERES }, (_, index) => 
    createSphereConfig(index)
  );

  return (
    <div className={styles.demoContent}>
      <InfoPanel 
        sphereCount={sphereConfigs.length}
        strength={strength}
        distance={distance}
        duration={duration}
        ease={ease}
        fullWindow={fullWindow}
      />
      
      <div className={styles.sphereField}>
        {sphereConfigs.map((config, index) => (
          <SphereWrapper
            key={`sphere-${index + 1}`}
            config={config}
            index={index}
            strength={strength}
            distance={distance}
            duration={duration}
            ease={ease}
            fullWindow={fullWindow}
            showTooltip={showTooltip}
          />
        ))}
      </div>
    </div>
  );
};
