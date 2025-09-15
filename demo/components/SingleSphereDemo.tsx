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

export const SingleSphereDemo: React.FC<SingleSphereDemoProps> = ({
  strength,
  distance,
  duration,
  ease,
  fullWindow,
  showTooltip
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [debugInfo, setDebugInfo] = useState<{
    distance: number;
    force: number;
    movement: number;
    effectiveDistance: number;
    active: boolean;
  } | null>(null);

  const magneticRef = useMagnetic<HTMLDivElement>({
    strength,
    distance,
    duration,
    ease,
    fullWindow,
    debug: false
  });

  const calculateMagneticForce = (distance: number) => {
    const effectiveDistance = fullWindow
      ? Math.max(400, 900 - 400, 300, 600 - 300)
      : distance;

    const normalizedDistance = distance / effectiveDistance;
    const magneticForce = Math.pow(1 - Math.min(normalizedDistance, 1), 3);
    const attractionStrength = magneticForce * strength;

    let movement: number;
    if (distance > 0) {
      if (distance < 3) {
        movement = attractionStrength * distance;
      } else {
        const baseMovement = attractionStrength * (effectiveDistance * 0.2);
        const distanceScaled = baseMovement * (1 - Math.exp(-distance / 100));
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

  const testDistances = [200, 100, 50, 10, 5];

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });

    const sphereElement = magneticRef.current;
    if (sphereElement) {
      const rect = sphereElement.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const cursorDistance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      );

      const effectiveDistance = fullWindow
        ? Math.max(centerX, window.innerWidth - centerX, centerY, window.innerHeight - centerY)
        : distance;

      const normalizedDistance = cursorDistance / effectiveDistance;
      const magneticForce = Math.pow(1 - Math.min(normalizedDistance, 1), 3);
      const attractionStrength = magneticForce * strength;

      let movement: number;
      if (cursorDistance > 0) {
        if (cursorDistance < 3) {
          movement = attractionStrength * cursorDistance;
        } else {
          const baseMovement = attractionStrength * (effectiveDistance * 0.2);
          movement = baseMovement * (1 - Math.exp(-cursorDistance / 100));
        }
      } else {
        movement = 0;
      }

      const isActive = fullWindow || cursorDistance < distance;

      setDebugInfo({
        distance: cursorDistance,
        force: magneticForce,
        movement,
        effectiveDistance,
        active: isActive
      });
    }
  };

  return (
    <div className={styles.demoContent} onMouseMove={handleMouseMove}>
      <div className={styles.sphereContainer}>
        <div
          ref={magneticRef}
          className={styles.sphere}
        />

        <div className={styles.physicsPanel}>
          <h4 className={styles.physicsPanelTitle}>Physics Test - Distance vs Movement</h4>
          {testDistances.map((dist, i) => {
            const physics = calculateMagneticForce(dist);
            return (
              <div key={dist} className={styles.physicsTest}>
                <div className={styles.physicsDistance}>
                  Distance: {dist}px
                </div>

                <div 
                  className={styles.physicsCursor}
                  style={{
                    left: `${150 + dist * 0.8}px`,
                  }} 
                />

                <div 
                  className={styles.physicsSphere}
                  style={{
                    transform: `translateX(${physics.movement * 1.5}px)`,
                  }} 
                />

                <div 
                  className={styles.physicsInfo}
                  style={{
                    marginLeft: `${280 + dist * 0.8}px`
                  }}
                >
                  Force: {physics.force.toFixed(3)} | Movement: {physics.movement.toFixed(1)}px
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showTooltip && debugInfo && (
        <div 
          className={`${styles.tooltip} ${!debugInfo.active ? styles.inactive : ''}`}
          style={{
            left: mousePos.x + 15,
            top: mousePos.y - 10,
          }}
        >
          <div className={styles.tooltipDistance}>Distance: <strong>{debugInfo.distance.toFixed(1)}px</strong></div>
          <div className={styles.tooltipDistance}>Effective: <strong>{debugInfo.effectiveDistance.toFixed(0)}px</strong></div>
          <div className={styles.tooltipDistance}>Force: <strong>{debugInfo.force.toFixed(3)}</strong></div>
          <div className={styles.tooltipDistance}>Movement: <strong>{debugInfo.movement.toFixed(1)}px</strong></div>
          <div className={styles.tooltipStatus}>
            {debugInfo.active ? '✓ ACTIVE' : '✗ INACTIVE'}
          </div>
        </div>
      )}
    </div>
  );
};
