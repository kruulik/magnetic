import React, { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { gsap } from 'gsap';

// Core component interface - no demo-specific props
export interface MagneticLavaRectangleProps {
  // Basic rectangle props - now optional for dynamic sizing
  width?: number;
  height?: number;
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  pointsPerSide?: number;

  // Visual props
  fill: string;
  className?: string;
  style?: React.CSSProperties;

  // Magnetic behavior props
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow?: boolean;

  // Callback props
  onCursorInside?: (isInside: boolean) => void;
  onMouseMove?: (e: MouseEvent) => void;

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
  svgPadding?: number;
}

// Physics configuration interface
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

// Default physics configuration
const DEFAULT_PHYSICS: Omit<PhysicsConfig, 'width' | 'height'> = {
  attractionMultiplier: 25,
  pointinessFactor: 0.3,
  minDistance: 25,
  surfaceBuffer: 80,
  stretchFactor: 0.5,
  pointinessMultiplier: 1.0,
  smoothingFactor: 0.4,
  dampeningPower: 0.7,
  forceCurveExponent: 2.0,
  minDampeningFactor: 0.1,
  perceivedCursorOffset: 20,
  svgPadding: 0,
  screenToSvgRatio: 1,
  maxPointiness: 0.4,
  closeDampeningThreshold: 3.5,
  tipActivationThreshold: 0.7,
  maxTipFactor: 0.8,
  pointyReductionAmount: 10
};

// Constants
const UI_CONSTANTS = {
  farAwayDistance: 1000,
  durationMultiplier: 0.3,
  pointinessStrengthFactor: 0.6,
  minCloseDampeningFactor: 0.05
};

// Utility functions
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
  }
};

const CoordinateUtils = {
  screenToSvg: (screenCoord: number, screenCenter: number, svgCenter: number, ratio: number): number => {
    return (screenCoord - screenCenter) * ratio + svgCenter;
  }
};

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
  },

  // Calculate maximum possible magnetic bulge radius for viewBox expansion
  calculateMaxBulgeRadius: (strength: number, distance: number, config: PhysicsConfig): number => {
    // Maximum magnetic force occurs at optimal distance (typically around minDistance * 2-3)
    const optimalDistance = config.minDistance * 2.5;
    const maxMagneticForce = PhysicsUtils.calculateBaseMagneticForce(optimalDistance, distance, config);
    const maxGlobalDampening = PhysicsUtils.calculateGlobalDampening(optimalDistance, config);
    const maxCloseDampening = PhysicsUtils.calculateCloseDampening(optimalDistance, config);

    // Calculate maximum attraction strength
    const maxAttractionStrength = maxMagneticForce * maxGlobalDampening * maxCloseDampening *
      strength * config.attractionMultiplier;

    // Add maximum pointiness contribution
    const maxPointiness = PhysicsUtils.calculatePointiness(maxMagneticForce, strength, optimalDistance, config);
    const maxPointinessContribution = maxPointiness * config.pointyReductionAmount;

    // Total maximum bulge radius (with reduced safety margin)
    const maxBulge = (maxAttractionStrength + maxPointinessContribution) * 0.8; // Reduced expansion

    // Ensure minimum expansion for visibility, but keep it reasonable
    return Math.max(Math.min(maxBulge, 40), 15); // Cap at 40px expansion, minimum 15px
  }
};

// Point interface
interface RectPoint {
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  baseX: number;
  baseY: number;
  sidePosition: number;
}

export const MagneticLavaRectangle: React.FC<MagneticLavaRectangleProps> = ({
  width: propWidth,
  height: propHeight,
  activeSides,
  pointsPerSide = 20,
  fill,
  className = '',
  style = {},
  strength,
  distance,
  duration,
  ease,
  fullWindow = false,
  onCursorInside,
  onMouseMove,
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
  cornerDeflectionFactor = 0.2,
  svgPadding = DEFAULT_PHYSICS.svgPadding
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInside, setIsInside] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  
  // Dynamic dimension state
  const [measuredDimensions, setMeasuredDimensions] = useState<{ width: number; height: number } | null>(null);
  
  // Use provided dimensions or measured dimensions
  const width = propWidth ?? measuredDimensions?.width ?? 0;
  const height = propHeight ?? measuredDimensions?.height ?? 0;

  // Force immediate measurement before first render
  useLayoutEffect(() => {
    if (containerRef.current && !propWidth && !propHeight && !measuredDimensions) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setMeasuredDimensions({ width: rect.width, height: rect.height });
      }
    }
  }, [propWidth, propHeight, measuredDimensions]);

  // Set up ResizeObserver for dynamic dimension detection
  useEffect(() => {
    if (!containerRef.current || (propWidth !== undefined && propHeight !== undefined)) {
      return; // Skip if explicit dimensions are provided
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: measuredWidth, height: measuredHeight } = entry.contentRect;
        
        // Only update if dimensions are meaningful (> 0)
        if (measuredWidth > 0 && measuredHeight > 0) {
          setMeasuredDimensions({
            width: measuredWidth,
            height: measuredHeight
          });
        }
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [propWidth, propHeight]);

  // Set up global mouse listeners
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (width > 0 && height > 0) {
        calculateMagneticEffect(e.clientX, e.clientY);
      }
      onMouseMove?.(e);
    };

    const handleScroll = () => {
      if (width > 0 && height > 0) {
        calculateMagneticEffect(0, 0);
      }
    };

    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [strength, distance, duration, ease, fullWindow, onMouseMove, width, height]);

  // Initialize path
  useEffect(() => {
    if (pathRef.current && svgRef.current && width > 0 && height > 0) {
      // Use consistent coordinate system for initialization
      const svgWidth = svgPadding === 0 ? width : width + 2 * svgPadding;
      const svgHeight = svgPadding === 0 ? height : height + 2 * svgPadding;
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
  }, [width, height, pointsPerSide, svgPadding]);

  // Don't render SVG until we have valid dimensions
  if (width <= 0 || height <= 0) {
    return (
      <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }}>
        {/* Empty container that ResizeObserver can measure */}
      </div>
    );
  }
  // Create physics config - ensure svgPadding prop overrides default
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
    perceivedCursorOffset,
    svgPadding // This should override DEFAULT_PHYSICS.svgPadding
  };

  // Generate rectangle points
  const generateRectanglePoints = (width: number, height: number): RectPoint[] => {
    const points: RectPoint[] = [];
    const offsetX = physicsConfig.svgPadding;
    const offsetY = physicsConfig.svgPadding;

    // Define 4 corners
    const corners = [
      { x: offsetX, y: offsetY, side: 'top' as const, pos: 0 },
      { x: offsetX + width, y: offsetY, side: 'top' as const, pos: 1 },
      { x: offsetX + width, y: offsetY + height, side: 'bottom' as const, pos: 0 },
      { x: offsetX, y: offsetY + height, side: 'bottom' as const, pos: 1 }
    ];

    // Always add corners
    corners.forEach(corner => {
      points.push({
        x: corner.x, y: corner.y,
        baseX: corner.x, baseY: corner.y,
        side: corner.side,
        sidePosition: corner.pos
      });
    });

    // Add intermediate points only on active sides
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

  // Calculate perceived cursor position
  const calculatePerceivedCursor = (
    actualMouseX: number,
    actualMouseY: number,
    rectCenterX: number,
    rectCenterY: number,
    offsetDistance: number = physicsConfig.perceivedCursorOffset
  ) => {
    if (offsetDistance === 0) {
      return { x: actualMouseX, y: actualMouseY };
    }

    const directionX = actualMouseX - rectCenterX;
    const directionY = actualMouseY - rectCenterY;
    const distance = VectorUtils.calculateDistance(actualMouseX, actualMouseY, rectCenterX, rectCenterY);

    if (distance === 0) {
      return { x: rectCenterX + offsetDistance, y: rectCenterY };
    }

    const normalized = VectorUtils.normalizeVector(directionX, directionY);
    const perceivedDistance = distance + offsetDistance;
    const perceivedX = rectCenterX + normalized.x * perceivedDistance;
    const perceivedY = rectCenterY + normalized.y * perceivedDistance;

    return { x: perceivedX, y: perceivedY };
  };

  // Check if point is inside shape using SVG hit detection
  const isPointInCurrentShape = (x: number, y: number): boolean => {
    if (!svgRef.current || !pathRef.current || !currentPath) return false;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = x - rect.left;
    const svgY = y - rect.top;

    // Use actual viewBox dimensions for coordinate conversion
    const svgWidth = physicsConfig.svgPadding === 0 ? width : width + 2 * physicsConfig.svgPadding;
    const svgHeight = physicsConfig.svgPadding === 0 ? height : height + 2 * physicsConfig.svgPadding;
    const localX = (svgX / rect.width) * svgWidth;
    const localY = (svgY / rect.height) * svgHeight;

    const point = svgRef.current.createSVGPoint();
    point.x = localX;
    point.y = localY;

    try {
      return pathRef.current.isPointInFill(point);
    } catch (e) {
      // Fallback bounds check - adjust for zero padding
      return localX >= physicsConfig.svgPadding &&
        localX <= physicsConfig.svgPadding + width &&
        localY >= physicsConfig.svgPadding &&
        localY <= physicsConfig.svgPadding + height;
    }
  };

  // Generate path from points with magnetic forces
  const generateLavaPath = (
    mouseX: number,
    mouseY: number,
    rectCenterX: number,
    rectCenterY: number,
    strength: number,
    effectiveDistance: number
  ): string => {
    const points = generateRectanglePoints(width, height);
    if (!svgRef.current || points.length === 0) return '';

    // Calculate SVG center based on actual viewBox dimensions
    const svgCenterX = physicsConfig.svgPadding === 0 ? width / 2 : (width + 2 * physicsConfig.svgPadding) / 2;
    const svgCenterY = physicsConfig.svgPadding === 0 ? height / 2 : (height + 2 * physicsConfig.svgPadding) / 2;

    const cursorSvgX = CoordinateUtils.screenToSvg(mouseX, rectCenterX, svgCenterX, 1);
    const cursorSvgY = CoordinateUtils.screenToSvg(mouseY, rectCenterY, svgCenterY, 1);

    const centerDistance = VectorUtils.calculateDistance(mouseX, mouseY, rectCenterX, rectCenterY);
    const globalDampening = PhysicsUtils.calculateGlobalDampening(centerDistance, physicsConfig);

    // Transform points based on magnetic forces
    const transformedPoints = points.map(point => {
      const isActive = activeSides.includes(point.side);
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

        const cornerIsActive = adjacentSides.every(side => activeSides.includes(side));
        if (!cornerIsActive) {
          return { ...point };
        }
      } else if (!isActive) {
        return { ...point };
      }

      // Apply magnetic forces
      const pointScreenX = rectCenterX + (point.baseX - svgCenterX);
      const pointScreenY = rectCenterY + (point.baseY - svgCenterY);

      const rawPointDistance = VectorUtils.calculateDistance(mouseX, mouseY, pointScreenX, pointScreenY);
      const pointDistanceToMouse = Math.max(rawPointDistance, physicsConfig.minDistance);

      const baseMagneticForce = PhysicsUtils.calculateBaseMagneticForce(pointDistanceToMouse, effectiveDistance, physicsConfig);
      const pointMagneticForce = baseMagneticForce * globalDampening;

      const directionToCursor = VectorUtils.normalizeVector(cursorSvgX - point.baseX, cursorSvgY - point.baseY);

      let attractionStrength = pointMagneticForce * strength * physicsConfig.attractionMultiplier;
      const closeDampening = PhysicsUtils.calculateCloseDampening(rawPointDistance, physicsConfig);
      attractionStrength *= closeDampening;

      // Apply corner dampening
      let cornerDampening = 1.0;
      if (isCornerPoint) {
        cornerDampening = cornerDeflectionFactor;
      } else {
        const distanceFromCorner = Math.min(point.sidePosition, 1 - point.sidePosition);
        const maxDampeningDistance = 0.3;
        if (distanceFromCorner < maxDampeningDistance) {
          const normalizedDistance = distanceFromCorner / maxDampeningDistance;
          const smoothFactor = 1 - Math.pow(1 - normalizedDistance, 2);
          cornerDampening = cornerDeflectionFactor + (1 - cornerDeflectionFactor) * smoothFactor;
        }
      }
      attractionStrength *= cornerDampening;

      let newX = point.baseX + directionToCursor.x * attractionStrength;
      let newY = point.baseY + directionToCursor.y * attractionStrength;

      // Add pointiness
      const pointinessAmount = PhysicsUtils.calculatePointiness(pointMagneticForce, strength, rawPointDistance, physicsConfig);
      if (pointinessAmount > 0) {
        newX += directionToCursor.x * pointinessAmount * physicsConfig.pointyReductionAmount;
        newY += directionToCursor.y * pointinessAmount * physicsConfig.pointyReductionAmount;
      }

      // Prevent inward movement - only allow outward bulging
      if (isCornerPoint) {
        const rectCenterX = physicsConfig.svgPadding + physicsConfig.width / 2;
        const rectCenterY = physicsConfig.svgPadding + physicsConfig.height / 2;

        const isLeftCorner = point.baseX < rectCenterX;
        const isTopCorner = point.baseY < rectCenterY;

        if (isLeftCorner && newX > point.baseX) newX = point.baseX;
        if (!isLeftCorner && newX < point.baseX) newX = point.baseX;
        if (isTopCorner && newY > point.baseY) newY = point.baseY;
        if (!isTopCorner && newY < point.baseY) newY = point.baseY;
      } else {
        switch (point.side) {
          case 'top':
            if (newY > point.baseY) newY = point.baseY;
            break;
          case 'right':
            if (newX < point.baseX) newX = point.baseX;
            break;
          case 'bottom':
            if (newY < point.baseY) newY = point.baseY;
            break;
          case 'left':
            if (newX > point.baseX) newX = point.baseX;
            break;
        }
      }

      return { ...point, x: newX, y: newY };
    });

    // Sort points for proper rectangle order
    const sortedPoints = transformedPoints.sort((a, b) => {
      const getOrder = (point: typeof a) => {
        if (point.side === 'top' && point.sidePosition === 0) return 0;
        if (point.side === 'top') return 1;
        if (point.side === 'right') return 2;
        if (point.side === 'bottom') return 3;
        if (point.side === 'left') return 4;
        return 5;
      };

      const orderA = getOrder(a);
      const orderB = getOrder(b);

      if (orderA !== orderB) return orderA - orderB;
      return a.sidePosition - b.sidePosition;
    });

    if (sortedPoints.length === 0) return '';

    let path = `M ${sortedPoints[0].x},${sortedPoints[0].y}`;
    for (let i = 1; i < sortedPoints.length; i++) {
      path += ` L ${sortedPoints[i].x},${sortedPoints[i].y}`;
    }
    path += ' Z';
    return path;
  };

  // Main magnetic effect calculation
  const calculateMagneticEffect = (mouseX: number, mouseY: number) => {
    if (!containerRef.current || !svgRef.current) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    const rectCenterX = svgRect.left + svgRect.width / 2;
    const rectCenterY = svgRect.top + svgRect.height / 2;

    const perceivedCursor = calculatePerceivedCursor(mouseX, mouseY, rectCenterX, rectCenterY);

    // Check if cursor is inside
    const currentlyInside = isPointInCurrentShape(mouseX, mouseY);
    if (currentlyInside !== isInside) {
      setIsInside(currentlyInside);
      onCursorInside?.(currentlyInside);
    }

    const actualDistance = VectorUtils.calculateDistance(mouseX, mouseY, rectCenterX, rectCenterY);
    const effectiveDistance = fullWindow
      ? Math.max(rectCenterX, window.innerWidth - rectCenterX, rectCenterY, window.innerHeight - rectCenterY)
      : distance;

    const isActive = fullWindow || actualDistance < distance;

    if (isActive) {
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
        // SVG path morphing handles all magnetic effects
        gsap.to(pathRef.current, {
          attr: { d: newPath },
          duration: duration * UI_CONSTANTS.durationMultiplier,
          ease: ease
        });
      }
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
    }
  };



  // Calculate dynamic viewBox with 1:1 scale (no expansion of dimensions)
  const maxBulgeRadius = PhysicsUtils.calculateMaxBulgeRadius(strength, distance, physicsConfig);

  // When svgPadding is 0, viewBox should match container exactly for full fill
  const viewBoxWidth = physicsConfig.svgPadding === 0 ? width : width + 2 * physicsConfig.svgPadding;
  const viewBoxHeight = physicsConfig.svgPadding === 0 ? height : height + 2 * physicsConfig.svgPadding;

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ display: 'block', overflow: 'visible' }}
      >
        <path
          ref={pathRef}
          fill={fill}
          stroke="none"
        />
      </svg>
    </div>
  );
};
