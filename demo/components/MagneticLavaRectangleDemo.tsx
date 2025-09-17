import React, { useState } from 'react';
import { MagneticLavaRectangle } from '../../src/components/MagneticLavaRectangle';
import styles from '../styles/MagneticLavaRectangleDemo.module.scss';

interface MagneticLavaRectangleDemoProps {
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  showTooltip: boolean;
  
  // Rectangle-specific props
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  width?: number;
  height?: number;
  pointsPerSide?: number;
  
  // Callback props
  onCursorInside?: (isInside: boolean) => void;
  baseColor?: string;
  hoverColor?: string;
  
  // Physics parameters
  attractionMultiplier?: number;
  pointinessFactor?: number;
  minDistance?: number;
  surfaceBuffer?: number;
  stretchFactor?: number;
  pointinessMultiplier?: number;
  smoothingFactor?: number;
  dampeningPower?: number;
  forceCurveExponent?: number;
  minDampeningFactor?: number;
  perceivedCursorOffset?: number;
  cornerDeflectionFactor?: number;
  magneticDistribution?: number;
  closeDampeningThreshold?: number;
  minCloseDampeningFactor?: number;
  cursorFieldRadius?: number;
  fieldGrowthFactor?: number;
  deformationMode?: 'cursor' | 'surface-normal';
}

// Demo-specific constants
const UI_CONSTANTS = {
  cursorIndicatorSize: 4,
  tooltipOffset: { x: 15, y: 10 },
};

export const MagneticLavaRectangleDemo: React.FC<MagneticLavaRectangleDemoProps> = ({
  strength,
  distance,
  duration,
  ease,
  fullWindow,
  showTooltip,
  activeSides,
  width = 300,
  height = 500,
  pointsPerSide = 200,
  onCursorInside,
  baseColor = '#3b3ec0ff',
  hoverColor = '#ef4444',
  // Physics parameters
  attractionMultiplier,
  pointinessFactor,
  minDistance,
  surfaceBuffer,
  stretchFactor,
  pointinessMultiplier,
  smoothingFactor,
  dampeningPower,
  forceCurveExponent,
  minDampeningFactor,
  perceivedCursorOffset,
  cornerDeflectionFactor,
  magneticDistribution,
  closeDampeningThreshold,
  minCloseDampeningFactor,
  cursorFieldRadius,
  fieldGrowthFactor,
  deformationMode
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [perceivedMousePos, setPerceivedMousePos] = useState({ x: 0, y: 0 });
  const [isInside, setIsInside] = useState(false);
  const [debugInfo, setDebugInfo] = useState<{
    distance: number;
    perceivedDistance: number;
    force: number;
    stretchAmount: number;
    pointiness: number;
    angle: number;
    active: boolean;
  } | null>(null);


  const handleMouseMove = (e: MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    
    // Update debug info (simplified for demo)
    if (showTooltip) {
      const distance = Math.sqrt(Math.pow(e.clientX - window.innerWidth/2, 2) + Math.pow(e.clientY - window.innerHeight/2, 2));
      setDebugInfo({
        distance,
        perceivedDistance: distance + (perceivedCursorOffset || 40),
        force: Math.max(0, 1 - distance / (fullWindow ? Math.max(window.innerWidth, window.innerHeight) : distance)),
        stretchAmount: strength * 0.5,
        pointiness: 0.3,
        angle: Math.atan2(e.clientY - window.innerHeight/2, e.clientX - window.innerWidth/2) * (180 / Math.PI),
        active: fullWindow || distance < distance
      });
    }
  };

  const handleCursorInside = (inside: boolean) => {
    setIsInside(inside);
    onCursorInside?.(inside);
  };

  const currentColor = isInside ? hoverColor : baseColor;

  return (
    <div className={styles.demoContent}>
      {/* Constrained container - dimensions controlled by width/height props */}
      <div 
        className={styles.constrainedContainer}
        style={{
          width: width,
          height: height,
        }}
      >
        <MagneticLavaRectangle
          activeSides={activeSides}
          pointsPerSide={pointsPerSide}
          fill={currentColor}
          strength={strength}
          distance={distance}
          duration={duration}
          ease={ease}
          fullWindow={fullWindow}
          onCursorInside={handleCursorInside}
          onMouseMove={handleMouseMove}
          attractionMultiplier={attractionMultiplier}
          pointinessFactor={pointinessFactor}
          minDistance={minDistance}
          surfaceBuffer={surfaceBuffer}
          stretchFactor={stretchFactor}
          pointinessMultiplier={pointinessMultiplier}
          smoothingFactor={smoothingFactor}
          dampeningPower={dampeningPower}
          forceCurveExponent={forceCurveExponent}
          minDampeningFactor={minDampeningFactor}
          perceivedCursorOffset={perceivedCursorOffset}
          cornerDeflectionFactor={cornerDeflectionFactor}
          magneticDistribution={magneticDistribution}
          closeDampeningThreshold={closeDampeningThreshold}
          minCloseDampeningFactor={minCloseDampeningFactor}
          cursorFieldRadius={cursorFieldRadius}
          fieldGrowthFactor={fieldGrowthFactor}
          deformationMode={deformationMode}
          svgPadding={0}
          className={styles.magneticRectangle}
        />
        
        {/* Perceived cursor indicator */}
        {debugInfo?.active && showTooltip && (
          <div
            className={styles.perceivedCursor}
            style={{
              left: perceivedMousePos.x - UI_CONSTANTS.cursorIndicatorSize,
              top: perceivedMousePos.y - UI_CONSTANTS.cursorIndicatorSize,
            }}
          />
        )}
      </div>

      {/* Demo-specific tooltip */}
      {showTooltip && debugInfo && (
        <div 
          className={`${styles.tooltip} ${!debugInfo.active ? styles.inactive : ''}`}
          style={{
            left: mousePos.x + UI_CONSTANTS.tooltipOffset.x,
            top: mousePos.y - UI_CONSTANTS.tooltipOffset.y,
          }}
        >
          <div className={styles.tooltipDistance}>Distance: <strong>{debugInfo.distance.toFixed(1)}px</strong></div>
          <div className={styles.tooltipDistance}>Perceived: <strong>{debugInfo.perceivedDistance.toFixed(1)}px</strong></div>
          <div className={styles.tooltipDistance}>Force: <strong>{debugInfo.force.toFixed(3)}</strong></div>
          <div className={styles.tooltipDistance}>Stretch: <strong>{debugInfo.stretchAmount.toFixed(2)}</strong></div>
          <div className={styles.tooltipDistance}>Inside: <strong>{isInside ? 'YES' : 'NO'}</strong></div>
          <div className={styles.tooltipDistance}>Active Sides: <strong>{activeSides.join(', ')}</strong></div>
          <div className={styles.tooltipDistance}>Container: <strong>{width}×{height}</strong></div>
          <div className={styles.tooltipDistance}>Element: <strong>{width}×{height}</strong></div>
          <div className={styles.tooltipStatus}>
            {debugInfo.active ? '✓ ACTIVE' : '✗ INACTIVE'}
          </div>
        </div>
      )}
    </div>
  );
};
