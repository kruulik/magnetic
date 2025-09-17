import { gsap } from 'gsap';
import React, { useRef, useEffect, useState } from 'react';

import styles from '../styles/LavaSphereDemo.module.scss';

interface LavaSphereDemoProps {
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  showTooltip: boolean;
  numPoints?: number;
  // New configurable physics parameters
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
}

// Physics configuration with sensible defaults
interface PhysicsConfig {
  baseRadius: number;
  attractionMultiplier: number;
  pointinessFactor: number;
  minDistance: number;
  surfaceBuffer: number;
  stretchFactor: number;
  pointinessMultiplier: number;
  smoothingFactor: number;
  dampeningPower: number;
  forceCurveExponent: number;
  minDampeningFactor: number;
  perceivedCursorOffset: number;
  svgSize: number;
  screenToSvgRatio: number;
  maxPointiness: number;
  closeDampeningThreshold: number;
  tipActivationThreshold: number;
  maxTipFactor: number;
  pointyReductionAmount: number;
}

// Default physics configuration
const DEFAULT_PHYSICS: PhysicsConfig = {
  baseRadius: 150,
  attractionMultiplier: 30,
  pointinessFactor: 0.5,
  minDistance: 20,
  surfaceBuffer: 60,
  stretchFactor: 0.6,
  pointinessMultiplier: 1.2,
  smoothingFactor: 0.4,
  dampeningPower: 0.6,
  forceCurveExponent: 2.5,
  minDampeningFactor: 0.15,
  perceivedCursorOffset: 30,
  svgSize: 600,
  screenToSvgRatio: 600 / 400,
  maxPointiness: 0.6,
  closeDampeningThreshold: 2,
  tipActivationThreshold: 0.6,
  maxTipFactor: 1,
  pointyReductionAmount: 15
};

// Additional constants for UI and behavior
const UI_CONSTANTS = {
  cursorIndicatorSize: 4,
  tooltipOffset: { x: 15, y: 10 },
  farAwayDistance: 1000,
  durationMultiplier: 0.3,
  pointinessStrengthFactor: 0.8,
  minCloseDampeningFactor: 0.2
};

// Coordinate system utilities
const CoordinateUtils = {
  screenToSvg: (screenCoord: number, screenCenter: number, svgCenter: number, ratio: number): number => (screenCoord - screenCenter) * ratio + svgCenter,
  
  svgToScreen: (svgCoord: number, svgCenter: number, screenCenter: number, ratio: number): number => (svgCoord - svgCenter) / ratio + screenCenter
};

// Distance and direction calculations
const VectorUtils = {
  calculateDistance: (x1: number, y1: number, x2: number, y2: number): number => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
  
  normalizeVector: (x: number, y: number): { x: number; y: number; length: number } => {
    const length = Math.sqrt(x * x + y * y);
    return {
      x: length > 0 ? x / length : 0,
      y: length > 0 ? y / length : 0,
      length
    };
  },
  
  calculateAngle: (x: number, y: number): number => Math.atan2(y, x)
};

// Physics calculations
const PhysicsUtils = {
  calculateBaseMagneticForce: (distance: number, effectiveDistance: number, config: PhysicsConfig): number => {
    const normalizedDistance = distance / effectiveDistance;
    return Math.pow(1 - Math.min(normalizedDistance, 1), config.forceCurveExponent);
  },
  
  calculateGlobalDampening: (distance: number, config: PhysicsConfig): number => {
    const sphereRadius = config.baseRadius * (400 / config.svgSize);
    
    if (distance < sphereRadius + config.surfaceBuffer) {
      const distanceFromSurface = Math.max(distance - sphereRadius, 0);
      const dampeningFactor = Math.max(distanceFromSurface / config.surfaceBuffer, config.minDampeningFactor);
      return Math.pow(dampeningFactor, config.dampeningPower);
    }
    
    return 1.0;
  },
  
  calculateCloseDampening: (rawDistance: number, config: PhysicsConfig): number => {
    if (rawDistance < config.minDistance * config.closeDampeningThreshold) {
      return Math.max(rawDistance / (config.minDistance * config.closeDampeningThreshold), UI_CONSTANTS.minCloseDampeningFactor);
    }
    return 1.0;
  },
  
  calculatePointiness: (magneticForce: number, strength: number, rawDistance: number, config: PhysicsConfig): number => {
    if (magneticForce > config.tipActivationThreshold && rawDistance > config.minDistance) {
      const tipFactor = Math.min((magneticForce - config.tipActivationThreshold) / (1 - config.tipActivationThreshold), config.maxTipFactor);
      const pointiness = Math.min(magneticForce * strength * UI_CONSTANTS.pointinessStrengthFactor, config.maxPointiness);
      return pointiness * tipFactor * config.pointinessFactor;
    }
    return 0;
  }
};

export const LavaSphereDemo: React.FC<LavaSphereDemoProps> = ({
  strength,
  distance,
  duration,
  ease,
  fullWindow,
  showTooltip,
  numPoints = 136,
  // Physics parameters with defaults from DEFAULT_PHYSICS
  attractionMultiplier = DEFAULT_PHYSICS.attractionMultiplier,
  pointinessFactor = DEFAULT_PHYSICS.pointinessFactor,
  minDistance = DEFAULT_PHYSICS.minDistance,
  surfaceBuffer = DEFAULT_PHYSICS.surfaceBuffer,
  stretchFactor = DEFAULT_PHYSICS.stretchFactor,
  pointinessMultiplier = DEFAULT_PHYSICS.pointinessMultiplier,
  smoothingFactor = DEFAULT_PHYSICS.smoothingFactor,
  dampeningPower = DEFAULT_PHYSICS.dampeningPower,
  forceCurveExponent = DEFAULT_PHYSICS.forceCurveExponent,
  minDampeningFactor = DEFAULT_PHYSICS.minDampeningFactor,
  perceivedCursorOffset = DEFAULT_PHYSICS.perceivedCursorOffset
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [perceivedMousePos, setPerceivedMousePos] = useState({ x: 0, y: 0 });
  const [debugInfo, setDebugInfo] = useState<{
    distance: number;
    perceivedDistance: number;
    force: number;
    stretchAmount: number;
    pointiness: number;
    angle: number;
    active: boolean;
  } | null>(null);

  // Create physics config from props
  const physicsConfig: PhysicsConfig = {
    ...DEFAULT_PHYSICS,
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
    perceivedCursorOffset
  };

  // Calculate perceived cursor position that's always offset farther from sphere center
  const calculatePerceivedCursor = (
    actualMouseX: number,
    actualMouseY: number,
    sphereCenterX: number,
    sphereCenterY: number,
    offsetDistance: number = physicsConfig.perceivedCursorOffset
  ) => {
    const directionX = actualMouseX - sphereCenterX;
    const directionY = actualMouseY - sphereCenterY;
    
    const distance = VectorUtils.calculateDistance(actualMouseX, actualMouseY, sphereCenterX, sphereCenterY);
    
    // If cursor is at center, return a slight offset to avoid division by zero
    if (distance === 0) {
      return { x: sphereCenterX + offsetDistance, y: sphereCenterY };
    }
    
    const normalized = VectorUtils.normalizeVector(directionX, directionY);
    
    // Calculate perceived position (actual distance + offset)
    const perceivedDistance = distance + offsetDistance;
    const perceivedX = sphereCenterX + normalized.x * perceivedDistance;
    const perceivedY = sphereCenterY + normalized.y * perceivedDistance;
    
    return { x: perceivedX, y: perceivedY };
  };

  const generateLavaPath = (
    mouseX: number,
    mouseY: number,
    sphereCenterX: number,
    sphereCenterY: number,
    strength: number,
    effectiveDistance: number,
    svgCenterX: number,
    svgCenterY: number,
    numPoints: number = 32
  ) => {
    const points: { x: number; y: number }[] = [];
    
    // Convert cursor position to SVG coordinates using utility
    const cursorSvgX = CoordinateUtils.screenToSvg(mouseX, sphereCenterX, svgCenterX, physicsConfig.screenToSvgRatio);
    const cursorSvgY = CoordinateUtils.screenToSvg(mouseY, sphereCenterY, svgCenterY, physicsConfig.screenToSvgRatio);
    
    // Calculate distance from cursor to sphere center for global dampening
    const centerDistance = VectorUtils.calculateDistance(mouseX, mouseY, sphereCenterX, sphereCenterY);
    
    // Apply global dampening using utility function
    const globalDampening = PhysicsUtils.calculateGlobalDampening(centerDistance, physicsConfig);
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      
      // Start with base circle position
      const baseX = svgCenterX + Math.cos(angle) * physicsConfig.baseRadius;
      const baseY = svgCenterY + Math.sin(angle) * physicsConfig.baseRadius;
      
      // Calculate this point's position in screen coordinates for distance calculation
      const pointScreenX = sphereCenterX + Math.cos(angle) * physicsConfig.baseRadius * (400/600);
      const pointScreenY = sphereCenterY + Math.sin(angle) * physicsConfig.baseRadius * (400/600);
      
      // Calculate distance to cursor with minimum distance protection
      const rawPointDistance = VectorUtils.calculateDistance(mouseX, mouseY, pointScreenX, pointScreenY);
      const pointDistanceToMouse = Math.max(rawPointDistance, physicsConfig.minDistance);
      
      // Calculate magnetic force using utility function
      const baseMagneticForce = PhysicsUtils.calculateBaseMagneticForce(pointDistanceToMouse, effectiveDistance, physicsConfig);
      
      // Apply global dampening to prevent pinching
      const pointMagneticForce = baseMagneticForce * globalDampening;
      
      // Calculate attraction vector toward cursor using utility
      const directionToCursor = VectorUtils.normalizeVector(cursorSvgX - baseX, cursorSvgY - baseY);
      
      // Calculate attraction strength with progressive dampening
      let attractionStrength = pointMagneticForce * strength * physicsConfig.attractionMultiplier;
      
      // Additional dampening for very close points using utility function
      const closeDampening = PhysicsUtils.calculateCloseDampening(rawPointDistance, physicsConfig);
      attractionStrength *= closeDampening;
      
      // Move point toward cursor
      let x = baseX + directionToCursor.x * attractionStrength;
      let y = baseY + directionToCursor.y * attractionStrength;
      
      // Add pointiness for closest points using utility function
      const pointinessAmount = PhysicsUtils.calculatePointiness(pointMagneticForce, strength, rawPointDistance, physicsConfig);
      if (pointinessAmount > 0) {
        x += directionToCursor.x * pointinessAmount * physicsConfig.pointyReductionAmount;
        y += directionToCursor.y * pointinessAmount * physicsConfig.pointyReductionAmount;
      }
      
      points.push({ x, y });
    }
    
    // Create ultra-smooth path with cubic Bézier curves
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    // Calculate smooth control points for each segment using cubic Bézier
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const prev = points[(i - 1 + points.length) % points.length];
      const nextNext = points[(i + 2) % points.length];
      
      // Calculate tangent vectors for smooth curves
      const prevToNext = {
        x: next.x - prev.x,
        y: next.y - prev.y
      };
      
      const currentToNextNext = {
        x: nextNext.x - current.x,
        y: nextNext.y - current.y
      };
      
      // Control points for cubic Bézier curve using configurable smoothing factor
      const cp1x = current.x + (prevToNext.x * physicsConfig.smoothingFactor);
      const cp1y = current.y + (prevToNext.y * physicsConfig.smoothingFactor);
      
      const cp2x = next.x - (currentToNextNext.x * physicsConfig.smoothingFactor);
      const cp2y = next.y - (currentToNextNext.y * physicsConfig.smoothingFactor);
      
      // Create cubic Bézier curve to next point
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }
    
    path += ' Z';
    return path;
  };

  const calculateMagneticEffect = (mouseX: number, mouseY: number) => {
    if (!containerRef.current || !svgRef.current) return;
    
    // Calculate SVG-specific center coordinates
    const svgRect = svgRef.current.getBoundingClientRect();
    const sphereCenterX = svgRect.left + svgRect.width / 2;
    const sphereCenterY = svgRect.top + svgRect.height / 2;
    
    // SVG coordinate center (for path generation)
    const svgViewBox = svgRef.current.viewBox.baseVal;
    const svgCenterX = svgViewBox.width / 2;
    const svgCenterY = svgViewBox.height / 2;
    
    // Calculate both actual and perceived cursor positions using utility functions
    const actualDistance = VectorUtils.calculateDistance(mouseX, mouseY, sphereCenterX, sphereCenterY);
    
    const perceivedCursor = calculatePerceivedCursor(mouseX, mouseY, sphereCenterX, sphereCenterY);
    setPerceivedMousePos(perceivedCursor);
    
    const perceivedDistance = VectorUtils.calculateDistance(perceivedCursor.x, perceivedCursor.y, sphereCenterX, sphereCenterY);

    const effectiveDistance = fullWindow 
      ? Math.max(sphereCenterX, window.innerWidth - sphereCenterX, sphereCenterY, window.innerHeight - sphereCenterY)
      : distance;

    // Use actual distance for activation check (so sphere responds when cursor gets close)
    const isActive = fullWindow || actualDistance < distance;
    
    if (isActive) {
      // Use perceived cursor position for all magnetic calculations
      const directionX = perceivedCursor.x - sphereCenterX;
      const directionY = perceivedCursor.y - sphereCenterY;
      const angle = VectorUtils.calculateAngle(directionX, directionY);
      
      // Calculate magnetic force using utility functions
      const baseMagneticForce = PhysicsUtils.calculateBaseMagneticForce(perceivedDistance, effectiveDistance, physicsConfig);
      
      // Apply global dampening using utility function
      const globalDampening = PhysicsUtils.calculateGlobalDampening(perceivedDistance, physicsConfig);
      
      const magneticForce = baseMagneticForce * globalDampening;
      
      const stretchAmount = magneticForce * strength * physicsConfig.stretchFactor;
      const pointiness = Math.min(magneticForce * strength * physicsConfig.pointinessMultiplier, physicsConfig.maxPointiness);
      
      // Use perceived cursor position for path generation
      const newPath = generateLavaPath(
        perceivedCursor.x, 
        perceivedCursor.y, 
        sphereCenterX, 
        sphereCenterY, 
        strength, 
        effectiveDistance, 
        svgCenterX, 
        svgCenterY,
        numPoints
      );
      
      if (pathRef.current) {
        gsap.to(pathRef.current, {
          attr: { d: newPath },
          duration: duration * UI_CONSTANTS.durationMultiplier,
          ease: ease
        });
      }
      
      setDebugInfo({
        distance: actualDistance,
        perceivedDistance: perceivedDistance,
        force: magneticForce,
        stretchAmount,
        pointiness,
        angle: angle * (180 / Math.PI),
        active: true
      });
    } else {
      // For inactive state, pass dummy values that result in base circle
      const circlePath = generateLavaPath(
        sphereCenterX + UI_CONSTANTS.farAwayDistance,
        sphereCenterY + UI_CONSTANTS.farAwayDistance, 
        sphereCenterX, 
        sphereCenterY, 
        0, // No strength
        effectiveDistance, 
        svgCenterX, 
        svgCenterY,
        numPoints
      );
      if (pathRef.current) {
        gsap.to(pathRef.current, {
          attr: { d: circlePath },
          duration: duration,
          ease: ease
        });
      }
      
      setDebugInfo({
        distance: actualDistance,
        perceivedDistance: 0,
        force: 0,
        stretchAmount: 0,
        pointiness: 0,
        angle: 0,
        active: false
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    calculateMagneticEffect(e.clientX, e.clientY);
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      calculateMagneticEffect(e.clientX, e.clientY);
    };

    const handleScroll = () => {
      // Recalculate with current mouse position when scroll happens
      calculateMagneticEffect(mousePos.x, mousePos.y);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [strength, distance, duration, ease, fullWindow, mousePos.x, mousePos.y]);

  useEffect(() => {
    if (pathRef.current && svgRef.current) {
      // Calculate SVG center for initialization
      const svgViewBox = svgRef.current.viewBox.baseVal;
      const svgCenterX = svgViewBox.width / 2;
      const svgCenterY = svgViewBox.height / 2;
      
      // Initialize with no magnetic force (far away cursor)
      const initialPath = generateLavaPath(
        svgCenterX + UI_CONSTANTS.farAwayDistance,
        svgCenterY + UI_CONSTANTS.farAwayDistance,
        svgCenterX, // Dummy sphere center for initialization
        svgCenterY,
        0, // No strength
        UI_CONSTANTS.farAwayDistance, // Dummy effective distance
        svgCenterX, 
        svgCenterY,
        numPoints
      );
      pathRef.current.setAttribute('d', initialPath);
    }
  }, []);

  return (
    <div className={styles.demoContent} onMouseMove={handleMouseMove}>
      <div className={styles.sphereContainer} ref={containerRef}>
        <svg 
          ref={svgRef} 
          className={styles.lavaSphere}
          width="600" 
          height="600" 
          viewBox="0 0 600 600"
        >
          <path 
            ref={pathRef}
            className={styles.spherePath}
            stroke="none"
          />
        </svg>
        
        {/* Red dot indicator for perceived cursor position - only show when debug tooltip is enabled */}
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

      {showTooltip && debugInfo && (
        <div 
          className={`${styles.tooltip} ${!debugInfo.active ? styles.inactive : ''}`}
          style={{
            left: mousePos.x + UI_CONSTANTS.tooltipOffset.x,
            top: mousePos.y - UI_CONSTANTS.tooltipOffset.y,
          }}
        >
          <div className={styles.tooltipDistance}>Actual Distance: <strong>{debugInfo.distance.toFixed(1)}px</strong></div>
          <div className={styles.tooltipDistance}>Perceived Distance: <strong>{debugInfo.perceivedDistance.toFixed(1)}px</strong></div>
          <div className={styles.tooltipDistance}>Force: <strong>{debugInfo.force.toFixed(3)}</strong></div>
          <div className={styles.tooltipDistance}>Stretch: <strong>{debugInfo.stretchAmount.toFixed(2)}</strong></div>
          <div className={styles.tooltipDistance}>Pointiness: <strong>{debugInfo.pointiness.toFixed(2)}</strong></div>
          <div className={styles.tooltipDistance}>Angle: <strong>{debugInfo.angle.toFixed(0)}°</strong></div>
          <div className={styles.tooltipStatus}>
            {debugInfo.active ? '✓ ACTIVE' : '✗ INACTIVE'}
          </div>
        </div>
      )}
    </div>
  );
};
