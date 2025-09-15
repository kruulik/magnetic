import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import styles from '../styles/LavaSphereDemo.module.scss';

interface LavaSphereDemoProps {
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  showTooltip: boolean;
  numPoints?: number;
}

export const LavaSphereDemo: React.FC<LavaSphereDemoProps> = ({
  strength,
  distance,
  duration,
  ease,
  fullWindow,
  showTooltip,
  numPoints = 136
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

  const baseRadius = 150;

  // Calculate perceived cursor position that's always offset farther from sphere center
  const calculatePerceivedCursor = (
    actualMouseX: number,
    actualMouseY: number,
    sphereCenterX: number,
    sphereCenterY: number,
    offsetDistance: number = 20
  ) => {
    const directionX = actualMouseX - sphereCenterX;
    const directionY = actualMouseY - sphereCenterY;
    
    // Calculate the distance from actual cursor to sphere center
    const distance = Math.sqrt(directionX * directionX + directionY * directionY);
    
    // If cursor is at center, return a slight offset to avoid division by zero
    if (distance === 0) {
      return { x: sphereCenterX + offsetDistance, y: sphereCenterY };
    }
    
    // Normalize direction vector
    const normalizedX = directionX / distance;
    const normalizedY = directionY / distance;
    
    // Calculate perceived position (actual distance + offset)
    const perceivedDistance = distance + offsetDistance;
    const perceivedX = sphereCenterX + normalizedX * perceivedDistance;
    const perceivedY = sphereCenterY + normalizedY * perceivedDistance;
    
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
    // Optimized constants to prevent pinching
    const ATTRACTION_MULTIPLIER = 25; // Reduced from 40 to prevent extreme forces
    const POINTINESS_FACTOR = 0.08;   // Reduced from 0.15 for gentler pointiness
    const MIN_DISTANCE = 20;          // Minimum distance to prevent extreme forces
    const SURFACE_BUFFER = 60;        // Distance from surface where dampening begins
    
    const points: { x: number; y: number }[] = [];
    
    // Convert cursor position to SVG coordinates
    const cursorSvgX = (mouseX - sphereCenterX) * (600/400) + svgCenterX;
    const cursorSvgY = (mouseY - sphereCenterY) * (600/400) + svgCenterY;
    
    // Calculate distance from cursor to sphere center for global dampening
    const centerDistance = Math.sqrt(
      Math.pow(mouseX - sphereCenterX, 2) + Math.pow(mouseY - sphereCenterY, 2)
    );
    
    // Global dampening when cursor gets too close to sphere
    const sphereRadius = baseRadius * (400/600); // Convert to screen coordinates
    let globalDampening = 1.0;
    
    if (centerDistance < sphereRadius + SURFACE_BUFFER) {
      // Apply progressive dampening as cursor approaches surface
      const distanceFromSurface = Math.max(centerDistance - sphereRadius, 0);
      const dampeningFactor = Math.max(distanceFromSurface / SURFACE_BUFFER, 0.15); // Minimum 15% force
      globalDampening = Math.pow(dampeningFactor, 0.6); // Gentler curve
    }
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      
      // Start with base circle position
      const baseX = svgCenterX + Math.cos(angle) * baseRadius;
      const baseY = svgCenterY + Math.sin(angle) * baseRadius;
      
      // Calculate this point's position in screen coordinates for distance calculation
      const pointScreenX = sphereCenterX + Math.cos(angle) * baseRadius * (400/600);
      const pointScreenY = sphereCenterY + Math.sin(angle) * baseRadius * (400/600);
      
      // Calculate distance to cursor with minimum distance protection
      const rawPointDistance = Math.sqrt(
        Math.pow(mouseX - pointScreenX, 2) + Math.pow(mouseY - pointScreenY, 2)
      );
      const pointDistanceToMouse = Math.max(rawPointDistance, MIN_DISTANCE);
      
      // Calculate magnetic force with smoother falloff
      const normalizedDistance = pointDistanceToMouse / effectiveDistance;
      const baseMagneticForce = Math.pow(1 - Math.min(normalizedDistance, 1), 2.5); // Gentler curve
      
      // Apply global dampening to prevent pinching
      const pointMagneticForce = baseMagneticForce * globalDampening;
      
      // Calculate attraction vector toward cursor
      const directionToCursorX = cursorSvgX - baseX;
      const directionToCursorY = cursorSvgY - baseY;
      const directionLength = Math.sqrt(directionToCursorX * directionToCursorX + directionToCursorY * directionToCursorY);
      
      // Normalize direction vector
      const normalizedDirectionX = directionLength > 0 ? directionToCursorX / directionLength : 0;
      const normalizedDirectionY = directionLength > 0 ? directionToCursorY / directionLength : 0;
      
      // Calculate attraction strength with progressive dampening
      let attractionStrength = pointMagneticForce * strength * ATTRACTION_MULTIPLIER;
      
      // Additional dampening for very close points to prevent extreme stretching
      if (rawPointDistance < MIN_DISTANCE * 2) {
        const closeDampening = Math.max(rawPointDistance / (MIN_DISTANCE * 2), 0.2);
        attractionStrength *= closeDampening;
      }
      
      // Move point toward cursor
      let x = baseX + normalizedDirectionX * attractionStrength;
      let y = baseY + normalizedDirectionY * attractionStrength;
      
      // Add gentle pointiness for closest points only
      if (pointMagneticForce > 0.6 && rawPointDistance > MIN_DISTANCE) {
        const tipFactor = Math.min((pointMagneticForce - 0.6) / 0.4, 1);
        const pointiness = Math.min(pointMagneticForce * strength * 0.8, 0.6); // Reduced intensity
        const pointyReduction = pointiness * tipFactor * POINTINESS_FACTOR;
        
        x += normalizedDirectionX * pointyReduction * 15; // Reduced from 20
        y += normalizedDirectionY * pointyReduction * 15;
      }
      
      points.push({ x, y });
    }
    
    // Create ultra-smooth path with cubic Bézier curves
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x},${points[0].y}`;
    
    // Calculate smooth control points for each segment using cubic Bézier
    const SMOOTHING_FACTOR = 0.4; // How much curve vs straight line
    
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
      
      // Control points for cubic Bézier curve
      const cp1x = current.x + (prevToNext.x * SMOOTHING_FACTOR);
      const cp1y = current.y + (prevToNext.y * SMOOTHING_FACTOR);
      
      const cp2x = next.x - (currentToNextNext.x * SMOOTHING_FACTOR);
      const cp2y = next.y - (currentToNextNext.y * SMOOTHING_FACTOR);
      
      // Create cubic Bézier curve to next point
      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
    }
    
    path += ' Z';
    return path;
  };

  const calculateMagneticEffect = (mouseX: number, mouseY: number) => {
    if (!containerRef.current || !svgRef.current) return;
    
    // Parameters aligned with generateLavaPath
    const STRETCH_FACTOR = 0.4;            // Reduced to match new gentler approach
    const POINTINESS_MULTIPLIER = 0.8;     // Reduced for gentler pointiness
    const SURFACE_BUFFER = 60;             // Match generateLavaPath buffer
    
    // Calculate SVG-specific center coordinates
    const svgRect = svgRef.current.getBoundingClientRect();
    const sphereCenterX = svgRect.left + svgRect.width / 2;
    const sphereCenterY = svgRect.top + svgRect.height / 2;
    
    // SVG coordinate center (for path generation)
    const svgViewBox = svgRef.current.viewBox.baseVal;
    const svgCenterX = svgViewBox.width / 2;
    const svgCenterY = svgViewBox.height / 2;
    
    // Calculate both actual and perceived cursor positions
    const actualDistance = Math.sqrt(
      Math.pow(mouseX - sphereCenterX, 2) + Math.pow(mouseY - sphereCenterY, 2)
    );
    
    const perceivedCursor = calculatePerceivedCursor(mouseX, mouseY, sphereCenterX, sphereCenterY, 30);
    setPerceivedMousePos(perceivedCursor);
    
    const perceivedDistance = Math.sqrt(
      Math.pow(perceivedCursor.x - sphereCenterX, 2) + Math.pow(perceivedCursor.y - sphereCenterY, 2)
    );

    const effectiveDistance = fullWindow 
      ? Math.max(sphereCenterX, window.innerWidth - sphereCenterX, sphereCenterY, window.innerHeight - sphereCenterY)
      : distance;

    // Use actual distance for activation check (so sphere responds when cursor gets close)
    const isActive = fullWindow || actualDistance < distance;
    
    if (isActive) {
      // Use perceived cursor position for all magnetic calculations
      const directionX = perceivedCursor.x - sphereCenterX;
      const directionY = perceivedCursor.y - sphereCenterY;
      const angle = Math.atan2(directionY, directionX);
      
      const normalizedDistance = perceivedDistance / effectiveDistance;
      const baseMagneticForce = Math.pow(1 - Math.min(normalizedDistance, 1), 2.5); // Match generateLavaPath curve
      
      // Apply same global dampening logic as generateLavaPath using perceived distance
      const sphereRadius = baseRadius * (400/600);
      let globalDampening = 1.0;
      
      if (perceivedDistance < sphereRadius + SURFACE_BUFFER) {
        const distanceFromSurface = Math.max(perceivedDistance - sphereRadius, 0);
        const dampeningFactor = Math.max(distanceFromSurface / SURFACE_BUFFER, 0.15);
        globalDampening = Math.pow(dampeningFactor, 0.6);
      }
      
      const magneticForce = baseMagneticForce * globalDampening;
      
      const stretchAmount = magneticForce * strength * STRETCH_FACTOR;
      const pointiness = Math.min(magneticForce * strength * POINTINESS_MULTIPLIER, 0.6); // Cap at 0.6
      
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
          duration: duration * 0.3,
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
        sphereCenterX + 1000, // Far away cursor position
        sphereCenterY + 1000, 
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
      calculateMagneticEffect(e.clientX, e.clientY);
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    return () => document.removeEventListener('mousemove', handleGlobalMouseMove);
  }, [strength, distance, duration, ease, fullWindow]);

  useEffect(() => {
    if (pathRef.current && svgRef.current) {
      // Calculate SVG center for initialization
      const svgViewBox = svgRef.current.viewBox.baseVal;
      const svgCenterX = svgViewBox.width / 2;
      const svgCenterY = svgViewBox.height / 2;
      
      // Initialize with no magnetic force (far away cursor)
      const initialPath = generateLavaPath(
        svgCenterX + 1000, // Far away cursor position
        svgCenterY + 1000,
        svgCenterX, // Dummy sphere center for initialization
        svgCenterY,
        0, // No strength
        1000, // Dummy effective distance
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
        
        {/* Red dot indicator for perceived cursor position */}
        {debugInfo?.active && (
          <div
            className={styles.perceivedCursor}
            style={{
              left: perceivedMousePos.x - 4,
              top: perceivedMousePos.y - 4,
            }}
          />
        )}
        
        <div className={styles.description}>
          <h3>Lava Sphere Demo</h3>
          <p>A ferrofluid-like sphere that morphs and stretches toward your cursor using magnetic physics.</p>
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
