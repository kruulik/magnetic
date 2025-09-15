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

export const MultiLavaSphereDemo: React.FC<MultiLavaSphereDemoProps> = ({
  strength,
  distance,
  duration,
  ease,
  fullWindow,
  showTooltip
}) => {
  // Create 39 different configurations for the spheres (3x13 grid)
  const sphereConfigs = Array.from({ length: 39 }, (_, index) => ({
    baseRadius: 80 + (index % 8) * 5, // Vary from 80 to 115
    color: generateVariedSphereColor(index + 1)
  }));

  return (
    <div className={styles.demoContent}>
      <div className={styles.infoPanel}>
        <h4 className={styles.infoPanelTitle}>Multi-Lava Sphere Field</h4>
        <p className={styles.infoPanelDescription}>
          39 ferrofluid-like spheres arranged in a 3x13 grid morph and stretch toward your cursor using magnetic physics. Each sphere responds independently with realistic lava-like deformation. Scroll to see position updates.
        </p>
        <div className={styles.infoPanelStats}>
          <div>Active spheres: {sphereConfigs.length}</div>
          <div>Magnetic strength: {strength}</div>
          <div>Field range: {fullWindow ? 'Full window' : `${distance}px`}</div>
          <div>Animation: {duration}s {ease}</div>
        </div>
      </div>
      
      <div className={styles.sphereField}>
        {sphereConfigs.map((config, index) => (
          <div 
            key={`sphere-${index + 1}`}
            className={styles.sphereWrapper}
            style={{
              // Override the sphere color by using CSS custom properties
              '--sphere-color': config.color,
            } as React.CSSProperties}
          >
            <div 
              style={{
                width: '200px',
                height: '200px',
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
                numPoints={68}
                attractionMultiplier={30 * (config.baseRadius / 150)}
                pointinessFactor={0.5}
                minDistance={20 * (config.baseRadius / 150)}
                surfaceBuffer={60 * (config.baseRadius / 150)}
                stretchFactor={0.6}
                pointinessMultiplier={1.2}
                smoothingFactor={0.4}
                dampeningPower={0.6}
                forceCurveExponent={2.5}
                minDampeningFactor={0.15}
                perceivedCursorOffset={30 * (config.baseRadius / 150)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
