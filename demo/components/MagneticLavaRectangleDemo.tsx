import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
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
  
  // Physics parameters (inherited from LavaSphereDemo)
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
  
  // Rectangle-specific physics parameters
  cornerDeflectionFactor?: number;
}

// Physics configuration with defaults adapted for rectangles
interface PhysicsConfig {
  width: number;
  height: number;
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
  svgPadding: number;
  screenToSvgRatio: number;
  maxPointiness: number;
  closeDampeningThreshold: number;
  tipActivationThreshold: number;
  maxTipFactor: number;
  pointyReductionAmount: number;
}

// Default physics configuration (tuned for rectangle geometry)
const DEFAULT_PHYSICS: Omit<PhysicsConfig, 'width' | 'height'> = {
  attractionMultiplier: 25,  // Reduced attraction
  pointinessFactor: 0.3,     // Less pointiness
  minDistance: 25,           // Larger minimum distance
  surfaceBuffer: 80,         // Larger buffer zone
  stretchFactor: 0.5,        // Reduced stretch
  pointinessMultiplier: 1.0, // Less pointiness multiplier
  smoothingFactor: 0.4,
  dampeningPower: 0.7,       // Stronger dampening power
  forceCurveExponent: 2.0,   // Gentler force curve
  minDampeningFactor: 0.1,   // Lower minimum dampening
  perceivedCursorOffset: 40, // Larger cursor offset
  svgPadding: 50,
  screenToSvgRatio: 1,
  maxPointiness: 0.4,        // Reduced max pointiness
  closeDampeningThreshold: 3.5, // Much higher threshold for close dampening
  tipActivationThreshold: 0.7,
  maxTipFactor: 0.8,         // Reduced tip factor
  pointyReductionAmount: 10  // Reduced pointiness amount
};
// Additional constants
const UI_CONSTANTS = {
  cursorIndicatorSize: 4,
  tooltipOffset: { x: 15, y: 10 },
  farAwayDistance: 1000,
  durationMultiplier: 0.3,
  pointinessStrengthFactor: 0.6, // Reduced from 0.8
  minCloseDampeningFactor: 0.05  // Much stronger minimum dampening
};

// Coordinate system utilities
const CoordinateUtils = {
  screenToSvg: (screenCoord: number, screenCenter: number, svgCenter: number, ratio: number): number => {
    return (screenCoord - screenCenter) * ratio + svgCenter;
  },
  
  svgToScreen: (svgCoord: number, svgCenter: number, screenCenter: number, ratio: number): number => {
    return (svgCoord - svgCenter) / ratio + screenCenter;
  }
};

// Vector calculations
const VectorUtils = {
  calculateDistance: (x1: number, y1: number, x2: number, y2: number): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  },
  
  normalizeVector: (x: number, y: number): { x: number; y: number; length: number } => {
    const length = Math.sqrt(x * x + y * y);
    return {
      x: length > 0 ? x / length : 0,
      y: length > 0 ? y / length : 0,
      length
    };
  },
  
  calculateAngle: (x: number, y: number): number => {
    return Math.atan2(y, x);
  },
  
  // Calculate distance from point to rectangle boundary (negative if inside, positive if outside)
  calculateDistanceToRectangleBoundary: (
    pointX: number, 
    pointY: number, 
    rectCenterX: number, 
    rectCenterY: number, 
    rectWidth: number, 
    rectHeight: number
  ): number => {
    // Convert to rectangle-local coordinates (center at origin)
    const localX = pointX - rectCenterX;
    const localY = pointY - rectCenterY;
    
    // Calculate distance to each edge
    const halfWidth = rectWidth / 2;
    const halfHeight = rectHeight / 2;
    
    // Distance to edges (positive when outside, negative when inside)
    const distToLeft = localX + halfWidth;
    const distToRight = halfWidth - localX;
    const distToTop = localY + halfHeight;
    const distToBottom = halfHeight - localY;
    
    // Check if point is inside rectangle
    const isInside = localX > -halfWidth && localX < halfWidth && 
                     localY > -halfHeight && localY < halfHeight;
    
    if (isInside) {
      // Inside: return negative distance to closest boundary
      const closestEdgeDistance = Math.min(distToLeft, distToRight, distToTop, distToBottom);
      return -closestEdgeDistance;
    } else {
      // Outside: calculate distance to closest point on rectangle
      const clampedX = Math.max(-halfWidth, Math.min(halfWidth, localX));
      const clampedY = Math.max(-halfHeight, Math.min(halfHeight, localY));
      
      return Math.sqrt(Math.pow(localX - clampedX, 2) + Math.pow(localY - clampedY, 2));
    }
  }
};

// Physics calculations
const PhysicsUtils = {
  calculateBaseMagneticForce: (distance: number, effectiveDistance: number, config: PhysicsConfig): number => {
    const normalizedDistance = distance / effectiveDistance;
    return Math.pow(1 - Math.min(normalizedDistance, 1), config.forceCurveExponent);
  },
  
  calculateGlobalDampening: (distance: number, config: PhysicsConfig): number => {
    if (distance < config.surfaceBuffer) {
      const dampeningFactor = Math.max(distance / config.surfaceBuffer, config.minDampeningFactor);
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

// Point definition
interface RectPoint {
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  baseX: number;
  baseY: number;
  sidePosition: number; // 0-1 position along the side
}

export const MagneticLavaRectangleDemo: React.FC<MagneticLavaRectangleDemoProps> = ({
  strength,
  distance,
  duration,
  ease,
  fullWindow,
  showTooltip,
  activeSides,
  width = 200,
  height = 400,
  pointsPerSide = 200,
  onCursorInside,
  baseColor = '#3b3ec0ff',
  hoverColor = '#ef4444',
  // Physics parameters with defaults
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
  perceivedCursorOffset = DEFAULT_PHYSICS.perceivedCursorOffset,
  
  // Rectangle-specific parameters
  cornerDeflectionFactor = 0.2  // Reduced corner deflection (0.0 = no deflection, 1.0 = full deflection)
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [perceivedMousePos, setPerceivedMousePos] = useState({ x: 0, y: 0 });
  const [isInside, setIsInside] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [debugInfo, setDebugInfo] = useState<{
    distance: number;
    perceivedDistance: number;
    force: number;
    stretchAmount: number;
    pointiness: number;
    angle: number;
    active: boolean;
  } | null>(null);

  // Create physics config
  const physicsConfig: PhysicsConfig = {
    ...DEFAULT_PHYSICS,
    width,
    height,
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

  // Generate rectangle points - start with perfect 4 corners, add points only on active sides
  const generateRectanglePoints = (width: number, height: number, mouseX: number, mouseY: number, rectCenterX: number, rectCenterY: number): RectPoint[] => {
    const points: RectPoint[] = [];
    const offsetX = physicsConfig.svgPadding;
    const offsetY = physicsConfig.svgPadding;

    // Define 4 perfect corners
    const corners = [
      { x: offsetX, y: offsetY, side: 'top' as const, pos: 0 },           // Top-left
      { x: offsetX + width, y: offsetY, side: 'top' as const, pos: 1 },   // Top-right  
      { x: offsetX + width, y: offsetY + height, side: 'bottom' as const, pos: 0 }, // Bottom-right
      { x: offsetX, y: offsetY + height, side: 'bottom' as const, pos: 1 }  // Bottom-left
    ];

    // Always add corners first
    corners.forEach(corner => {
      points.push({
        x: corner.x, y: corner.y,
        baseX: corner.x, baseY: corner.y,
        side: corner.side,
        sidePosition: corner.pos
      });
    });

    // Add intermediate points ONLY on active sides
    activeSides.forEach(side => {
      for (let i = 1; i < pointsPerSide - 1; i++) {
        const t = i / (pointsPerSide - 1);
        let x: number, y: number;
        
        switch (side) {
          case 'top':
            x = offsetX + t * width;
            y = offsetY;
            break;
          case 'right':
            x = offsetX + width;
            y = offsetY + t * height;
            break;
          case 'bottom':
            x = offsetX + width - t * width;
            y = offsetY + height;
            break;
          case 'left':
            x = offsetX;
            y = offsetY + height - t * height;
            break;
        }
        
        points.push({
          x, y,
          baseX: x, baseY: y,
          side,
          sidePosition: t
        });
      }
    });

    return points;
  };

  // Calculate perceived cursor position that's always offset farther from shape center (from LavaSphereDemo)
  const calculatePerceivedCursor = (
    actualMouseX: number,
    actualMouseY: number,
    rectCenterX: number,
    rectCenterY: number,
    offsetDistance: number = physicsConfig.perceivedCursorOffset
  ) => {
    // If offset is 0, return actual cursor position
    if (offsetDistance === 0) {
      return { x: actualMouseX, y: actualMouseY };
    }
    
    const directionX = actualMouseX - rectCenterX;
    const directionY = actualMouseY - rectCenterY;
    
    const distance = VectorUtils.calculateDistance(actualMouseX, actualMouseY, rectCenterX, rectCenterY);
    
    // If cursor is at center, return a slight offset to avoid division by zero
    if (distance === 0) {
      return { x: rectCenterX + offsetDistance, y: rectCenterY };
    }
    
    const normalized = VectorUtils.normalizeVector(directionX, directionY);
    
    // Calculate perceived position (actual distance + offset)
    const perceivedDistance = distance + offsetDistance;
    const perceivedX = rectCenterX + normalized.x * perceivedDistance;
    const perceivedY = rectCenterY + normalized.y * perceivedDistance;
    
    return { x: perceivedX, y: perceivedY };
  };

  // Check if point is inside the current morphed shape using SVG path hit detection
  const isPointInCurrentShape = (x: number, y: number): boolean => {
    if (!svgRef.current || !pathRef.current || !currentPath) return false;
    
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = x - rect.left;
    const svgY = y - rect.top;
    
    // Convert to SVG coordinates
    const svgWidth = width + 2 * physicsConfig.svgPadding;
    const svgHeight = height + 2 * physicsConfig.svgPadding;
    const localX = (svgX / rect.width) * svgWidth;
    const localY = (svgY / rect.height) * svgHeight;
    
    // Create a temporary SVG point for hit testing
    const point = svgRef.current.createSVGPoint();
    point.x = localX;
    point.y = localY;
    
    // Use SVG's built-in hit detection on the current path
    try {
      return pathRef.current.isPointInFill(point);
    } catch (e) {
      // Fallback to bounding box check if path hit detection fails
      return localX >= physicsConfig.svgPadding && 
             localX <= physicsConfig.svgPadding + width &&
             localY >= physicsConfig.svgPadding && 
             localY <= physicsConfig.svgPadding + height;
    }
  };

  // Generate path from points
  const generateLavaPath = (
    mouseX: number,
    mouseY: number,
    rectCenterX: number,
    rectCenterY: number,
    strength: number,
    effectiveDistance: number
  ): string => {
    const points = generateRectanglePoints(width, height, mouseX, mouseY, rectCenterX, rectCenterY);
    
    if (!svgRef.current) return '';

    const svgRect = svgRef.current.getBoundingClientRect();
    const svgCenterX = (width + 2 * physicsConfig.svgPadding) / 2;
    const svgCenterY = (height + 2 * physicsConfig.svgPadding) / 2;
    
    // Convert cursor to SVG coordinates
    const cursorSvgX = CoordinateUtils.screenToSvg(mouseX, rectCenterX, svgCenterX, 1);
    const cursorSvgY = CoordinateUtils.screenToSvg(mouseY, rectCenterY, svgCenterY, 1);
    
    // Calculate distance from cursor to rectangle center for global dampening
    const centerDistance = VectorUtils.calculateDistance(mouseX, mouseY, rectCenterX, rectCenterY);
    const globalDampening = PhysicsUtils.calculateGlobalDampening(centerDistance, physicsConfig);
    
    // Transform points based on magnetic forces
    const transformedPoints = points.map(point => {
      // Check if this point's side is active
      const isActive = activeSides.includes(point.side);
      
      // Special handling for corner points - they should NEVER move unless BOTH adjacent sides are active
      const isCornerPoint = (point.sidePosition === 0 || point.sidePosition === 1);
      if (isCornerPoint) {
        let adjacentSides: Array<'top' | 'right' | 'bottom' | 'left'> = [];
        
        if (point.side === 'top') {
          adjacentSides = point.sidePosition === 0 ? ['top', 'left'] : ['top', 'right'];
        } else if (point.side === 'right') {
          adjacentSides = point.sidePosition === 0 ? ['right', 'top'] : ['right', 'bottom'];
        } else if (point.side === 'bottom') {
          adjacentSides = point.sidePosition === 0 ? ['bottom', 'right'] : ['bottom', 'left'];
        } else if (point.side === 'left') {
          adjacentSides = point.sidePosition === 0 ? ['left', 'bottom'] : ['left', 'top'];
        }
        
        // Corner is LOCKED unless BOTH adjacent sides are active
        const cornerIsActive = adjacentSides.every(side => activeSides.includes(side));
        if (!cornerIsActive) {
          return { ...point }; // Keep original position
        }
      } else if (!isActive) {
        // Regular side points - inactive sides are LOCKED
        return { ...point };
      }
      
      // Progressive corner dampening - smooth transition based on distance from corners
      let cornerDampening = 1.0;
      
      if (isCornerPoint) {
        // Corner points get cornerDeflectionFactor applied
        cornerDampening = cornerDeflectionFactor;
      } else {
        // Calculate distance from nearest corner (0 = at corner, 0.5 = middle of side)
        const distanceFromCorner = Math.min(point.sidePosition, 1 - point.sidePosition);
        
        // Progressive dampening: stronger near corners (0), weaker toward middle (0.5)
        // Use smooth curve to avoid harsh transitions
        const maxDampeningDistance = 0.3; // How far from corner to apply dampening
        if (distanceFromCorner < maxDampeningDistance) {
          // Smooth curve from cornerDeflectionFactor at corner to 1.0 at maxDistance
          const normalizedDistance = distanceFromCorner / maxDampeningDistance;
          const smoothFactor = 1 - Math.pow(1 - normalizedDistance, 2); // Smooth ease-out curve
          cornerDampening = cornerDeflectionFactor + (1 - cornerDeflectionFactor) * smoothFactor;
        }
      }
      
      // Calculate distance to cursor in screen coordinates
      const pointScreenX = rectCenterX + (point.baseX - svgCenterX);
      const pointScreenY = rectCenterY + (point.baseY - svgCenterY);
      
      const rawPointDistance = VectorUtils.calculateDistance(mouseX, mouseY, pointScreenX, pointScreenY);
      const pointDistanceToMouse = Math.max(rawPointDistance, physicsConfig.minDistance);
      
      // Calculate magnetic force
      const baseMagneticForce = PhysicsUtils.calculateBaseMagneticForce(pointDistanceToMouse, effectiveDistance, physicsConfig);
      const pointMagneticForce = baseMagneticForce * globalDampening;
      
      // Calculate attraction vector
      const directionToCursor = VectorUtils.normalizeVector(cursorSvgX - point.baseX, cursorSvgY - point.baseY);
      
      // Calculate attraction strength
      let attractionStrength = pointMagneticForce * strength * physicsConfig.attractionMultiplier;
      
      // Apply close dampening
      const closeDampening = PhysicsUtils.calculateCloseDampening(rawPointDistance, physicsConfig);
      attractionStrength *= closeDampening;
      
      // Apply corner dampening
      attractionStrength *= cornerDampening;
      
      // Apply attraction
      let newX = point.baseX + directionToCursor.x * attractionStrength;
      let newY = point.baseY + directionToCursor.y * attractionStrength;
      
      // Add pointiness
      const pointinessAmount = PhysicsUtils.calculatePointiness(pointMagneticForce, strength, rawPointDistance, physicsConfig);
      if (pointinessAmount > 0) {
        newX += directionToCursor.x * pointinessAmount * physicsConfig.pointyReductionAmount;
        newY += directionToCursor.y * pointinessAmount * physicsConfig.pointyReductionAmount;
      }
      
      // CONSTRAINT: Prevent inward movement - only allow outward bulging
      // Apply to ALL points including corners to prevent inward folding
      
      if (isCornerPoint) {
        // Corner points have two constraints - they can only move away from rectangle center
        const rectCenterX = physicsConfig.svgPadding + physicsConfig.width / 2;
        const rectCenterY = physicsConfig.svgPadding + physicsConfig.height / 2;
        
        // Determine if this corner is left/right and top/bottom
        const isLeftCorner = point.baseX < rectCenterX;
        const isTopCorner = point.baseY < rectCenterY;
        
        // Apply constraints for both X and Y directions
        if (isLeftCorner) {
          // Left corners can only move further left (negative X)
          if (newX > point.baseX) {
            newX = point.baseX;
          }
        } else {
          // Right corners can only move further right (positive X)  
          if (newX < point.baseX) {
            newX = point.baseX;
          }
        }
        
        if (isTopCorner) {
          // Top corners can only move further up (negative Y)
          if (newY > point.baseY) {
            newY = point.baseY;
          }
        } else {
          // Bottom corners can only move further down (positive Y)
          if (newY < point.baseY) {
            newY = point.baseY;
          }
        }
      } else {
        // Regular side points - same constraint as before
        switch (point.side) {
          case 'top':
            // Top side can only move upward (negative Y) or stay same
            if (newY > point.baseY) {
              newY = point.baseY;
            }
            break;
          case 'right':
            // Right side can only move rightward (positive X) or stay same
            if (newX < point.baseX) {
              newX = point.baseX;
            }
            break;
          case 'bottom':
            // Bottom side can only move downward (positive Y) or stay same
            if (newY < point.baseY) {
              newY = point.baseY;
            }
            break;
          case 'left':
            // Left side can only move leftward (negative X) or stay same
            if (newX > point.baseX) {
              newX = point.baseX;
            }
            break;
        }
      }
      
      return {
        ...point,
        x: newX,
        y: newY
      };
    });
    
    // Sort points to create proper rectangle order: start from top-left, go clockwise
    const sortedPoints = transformedPoints.sort((a, b) => {
      // Define order: top-left -> top-right -> bottom-right -> bottom-left
      const getOrder = (point: typeof a) => {
        if (point.side === 'top' && point.sidePosition === 0) return 0; // top-left corner
        if (point.side === 'top') return 1; // top side points
        if (point.side === 'right') return 2; // right side points  
        if (point.side === 'bottom') return 3; // bottom side points
        if (point.side === 'left') return 4; // left side points
        return 5;
      };
      
      const orderA = getOrder(a);
      const orderB = getOrder(b);
      
      if (orderA !== orderB) return orderA - orderB;
      
      // Within same side, sort by position
      return a.sidePosition - b.sidePosition;
    });

    if (sortedPoints.length === 0) return '';
    
    // Create smooth curves for active sides, perfect straight lines for inactive sides
    let path = `M ${sortedPoints[0].x},${sortedPoints[0].y}`;
    
    for (let i = 1; i < sortedPoints.length; i++) {
      const current = sortedPoints[i - 1];
      const next = sortedPoints[i];
      
      // Check if this segment is on an active side
      const isActiveSegment = activeSides.includes(current.side) || activeSides.includes(next.side);
      
      // Simple straight line to next point
      path += ` L ${next.x},${next.y}`;
    }
    
    // Close the path
    path += ' Z';
    return path;
  };

  const calculateMagneticEffect = (mouseX: number, mouseY: number) => {
    if (!containerRef.current || !svgRef.current) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const rectCenterX = svgRect.left + svgRect.width / 2;
    const rectCenterY = svgRect.top + svgRect.height / 2;
    
    // Calculate perceived cursor position
    const perceivedCursor = calculatePerceivedCursor(mouseX, mouseY, rectCenterX, rectCenterY);
    setPerceivedMousePos(perceivedCursor);
    
    // Check if cursor is inside the current morphed shape
    const currentlyInside = isPointInCurrentShape(mouseX, mouseY);
    if (currentlyInside !== isInside) {
      setIsInside(currentlyInside);
      onCursorInside?.(currentlyInside);
    }
    
    const actualDistance = VectorUtils.calculateDistance(mouseX, mouseY, rectCenterX, rectCenterY);
    const perceivedDistance = VectorUtils.calculateDistance(perceivedCursor.x, perceivedCursor.y, rectCenterX, rectCenterY);

    const effectiveDistance = fullWindow 
      ? Math.max(rectCenterX, window.innerWidth - rectCenterX, rectCenterY, window.innerHeight - rectCenterY)
      : distance;

    const isActive = fullWindow || actualDistance < distance;
    
    if (isActive) {
      const directionX = perceivedCursor.x - rectCenterX;
      const directionY = perceivedCursor.y - rectCenterY;
      const angle = VectorUtils.calculateAngle(directionX, directionY);
      
      const baseMagneticForce = PhysicsUtils.calculateBaseMagneticForce(perceivedDistance, effectiveDistance, physicsConfig);
      const globalDampening = PhysicsUtils.calculateGlobalDampening(perceivedDistance, physicsConfig);
      const magneticForce = baseMagneticForce * globalDampening;
      
      const stretchAmount = magneticForce * strength * physicsConfig.stretchFactor;
      const pointiness = Math.min(magneticForce * strength * physicsConfig.pointinessMultiplier, physicsConfig.maxPointiness);
      
      const newPath = generateLavaPath(
        perceivedCursor.x, 
        perceivedCursor.y, 
        rectCenterX, 
        rectCenterY, 
        strength, 
        effectiveDistance
      );
      
      setCurrentPath(newPath);
      
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
      // Generate base rectangle path
      const basePath = generateLavaPath(
        rectCenterX + UI_CONSTANTS.farAwayDistance,
        rectCenterY + UI_CONSTANTS.farAwayDistance,
        rectCenterX,
        rectCenterY,
        0,
        effectiveDistance
      );
      
      setCurrentPath(basePath);
      
      if (pathRef.current) {
        gsap.to(pathRef.current, {
          attr: { d: basePath },
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
      // Initialize with base rectangle
      const svgWidth = width + 2 * physicsConfig.svgPadding;
      const svgHeight = height + 2 * physicsConfig.svgPadding;
      const svgCenterX = svgWidth / 2;
      const svgCenterY = svgHeight / 2;
      
      const initialPath = generateLavaPath(
        svgCenterX + UI_CONSTANTS.farAwayDistance,
        svgCenterY + UI_CONSTANTS.farAwayDistance,
        svgCenterX,
        svgCenterY,
        0,
        UI_CONSTANTS.farAwayDistance
      );
      
      pathRef.current.setAttribute('d', initialPath);
      setCurrentPath(initialPath);
    }
  }, [width, height, pointsPerSide]);

  const svgWidth = width + 2 * physicsConfig.svgPadding;
  const svgHeight = height + 2 * physicsConfig.svgPadding;
  const currentColor = isInside ? hoverColor : baseColor;

  return (
    <div className={styles.demoContent} onMouseMove={handleMouseMove}>
      <div className={styles.rectangleContainer} ref={containerRef}>
        <svg 
          ref={svgRef} 
          className={styles.magneticRectangle}
          width="100%" 
          height="100%" 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <path 
            ref={pathRef}
            className={styles.rectanglePath}
            fill={currentColor}
            stroke="none"
          />
        </svg>
        
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
          <div className={styles.tooltipStatus}>
            {debugInfo.active ? '✓ ACTIVE' : '✗ INACTIVE'}
          </div>
        </div>
      )}
    </div>
  );
};
