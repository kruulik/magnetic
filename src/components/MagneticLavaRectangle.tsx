import { gsap } from 'gsap';
import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';

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

  // Physics parameters - essential 6 core parameters only
  stretchiness?: number;
  minDistance?: number;
  perceivedCursorOffset?: number;
  cornerDeflectionFactor?: number;
  deformationMode?: 'cursor' | 'surface-normal';
}

// Physics configuration interface
interface PhysicsConfig {
  width: number;
  height: number;
  stretchiness: number;
  minDistance: number;
  perceivedCursorOffset: number;
}

// Default physics configuration
const DEFAULT_PHYSICS: Omit<PhysicsConfig, 'width' | 'height'> = {
  stretchiness: 0.5,
  minDistance: 25,
  perceivedCursorOffset: 20
};

// Constants to replace magic numbers
const MATH_CONSTANTS = {
  HALF: 0.5,
  POWER_OF_TWO: 2,
  SQRT_HALF: 0.707,
  NEGATIVE_SQRT_HALF: -0.707,
  CORNER_BLEND_FACTOR: 0.3,
  STRETCH_SCALE_FACTOR: 0.5,
  FIXED_PADDING: 50,
  FAR_AWAY_DISTANCE: 1000,
  DURATION_MULTIPLIER: 0.3,
  MIN_CLOSE_DAMPENING_FACTOR: 0.05,
  SORT_ORDER_TOP_CORNER: 0,
  SORT_ORDER_TOP: 1,
  SORT_ORDER_RIGHT: 2,
  SORT_ORDER_BOTTOM: 3,
  SORT_ORDER_LEFT: 4,
  SORT_ORDER_DEFAULT: 5
} as const;

// Point interface
interface RectPoint {
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  baseX: number;
  baseY: number;
  sidePosition: number;
}

// Utility functions
const VectorUtils = {
  calculateDistance: (x1: number, y1: number, x2: number, y2: number): number => 
    Math.sqrt(Math.pow(x2 - x1, MATH_CONSTANTS.POWER_OF_TWO) + Math.pow(y2 - y1, MATH_CONSTANTS.POWER_OF_TWO)),

  normalizeVector: (x: number, y: number): { x: number; y: number; length: number } => {
    const length = Math.sqrt(x * x + y * y);
    return {
      x: length > 0 ? x / length : 0,
      y: length > 0 ? y / length : 0,
      length
    };
  }
};

const calculateCornerNormal = (side: string, sidePosition: number): { x: number; y: number } => {
  switch (side) {
    case 'top':
      return sidePosition === 0 
        ? { x: MATH_CONSTANTS.NEGATIVE_SQRT_HALF, y: MATH_CONSTANTS.NEGATIVE_SQRT_HALF }
        : { x: MATH_CONSTANTS.SQRT_HALF, y: MATH_CONSTANTS.NEGATIVE_SQRT_HALF };
    case 'right':
      return sidePosition === 0 
        ? { x: MATH_CONSTANTS.SQRT_HALF, y: MATH_CONSTANTS.NEGATIVE_SQRT_HALF }
        : { x: MATH_CONSTANTS.SQRT_HALF, y: MATH_CONSTANTS.SQRT_HALF };
    case 'bottom':
      return sidePosition === 0 
        ? { x: MATH_CONSTANTS.SQRT_HALF, y: MATH_CONSTANTS.SQRT_HALF }
        : { x: MATH_CONSTANTS.NEGATIVE_SQRT_HALF, y: MATH_CONSTANTS.SQRT_HALF };
    case 'left':
      return sidePosition === 0 
        ? { x: MATH_CONSTANTS.NEGATIVE_SQRT_HALF, y: MATH_CONSTANTS.SQRT_HALF }
        : { x: MATH_CONSTANTS.NEGATIVE_SQRT_HALF, y: MATH_CONSTANTS.NEGATIVE_SQRT_HALF };
    default:
      return { x: 0, y: 0 };
  }
};

const calculateSurfaceNormal = (point: RectPoint, isCorner: boolean): { x: number; y: number } => {
  if (isCorner) {
    return calculateCornerNormal(point.side, point.sidePosition);
  }

  switch (point.side) {
    case 'top':
      return { x: 0, y: -1 };
    case 'right':
      return { x: 1, y: 0 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
};

const CoordinateUtils = {
  screenToSvg: (screenCoord: number, screenCenter: number, svgCenter: number): number => 
    (screenCoord - screenCenter) + svgCenter
};

const PhysicsUtils = {
  calculateBaseMagneticForce: (distance: number, effectiveDistance: number): number => {
    const normalizedDistance = Math.min(distance / effectiveDistance, 1);
    return Math.pow(1 - normalizedDistance, MATH_CONSTANTS.POWER_OF_TWO);
  },

  calculateStretch: (magneticForce: number, strength: number, config: PhysicsConfig): number => 
    magneticForce * strength * config.stretchiness * MATH_CONSTANTS.STRETCH_SCALE_FACTOR
};

const generateCornerPoints = (dimensions: { width: number; height: number }): RectPoint[] => [
  { x: 0, y: 0, baseX: 0, baseY: 0, side: 'top', sidePosition: 0 },
  { x: dimensions.width, y: 0, baseX: dimensions.width, baseY: 0, side: 'top', sidePosition: 1 },
  { x: dimensions.width, y: dimensions.height, baseX: dimensions.width, baseY: dimensions.height, side: 'bottom', sidePosition: 0 },
  { x: 0, y: dimensions.height, baseX: 0, baseY: dimensions.height, side: 'bottom', sidePosition: 1 }
];

const generateSidePoints = (params: {
  side: 'top' | 'right' | 'bottom' | 'left';
  pointsPerSide: number;
  dimensions: { width: number; height: number };
}): RectPoint[] => {
  const { side, pointsPerSide, dimensions } = params;
  const points: RectPoint[] = [];
  
  for (let i = 1; i < pointsPerSide - 1; i++) {
    const t = i / (pointsPerSide - 1);
    let x: number, y: number;

    switch (side) {
      case 'top':
        x = t * dimensions.width;
        y = 0;
        break;
      case 'right':
        x = dimensions.width;
        y = t * dimensions.height;
        break;
      case 'bottom':
        x = dimensions.width - t * dimensions.width;
        y = dimensions.height;
        break;
      case 'left':
        x = 0;
        y = dimensions.height - t * dimensions.height;
        break;
    }

    points.push({
      x, y,
      baseX: x, baseY: y,
      side,
      sidePosition: t
    });
  }
  
  return points;
};

const generateRectanglePoints = (params: {
  dimensions: { width: number; height: number };
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  pointsPerSide: number;
}): RectPoint[] => {
  const { dimensions, activeSides, pointsPerSide } = params;
  const points: RectPoint[] = [];

  const corners = generateCornerPoints(dimensions);
  points.push(...corners);

  activeSides.forEach(side => {
    const sidePoints = generateSidePoints({ side, pointsPerSide, dimensions });
    points.push(...sidePoints);
  });

  return points;
};

const calculatePerceivedCursor = (params: {
  mouseX: number;
  mouseY: number;
  centerX: number;
  centerY: number;
  offset: number;
}) => {
  const { mouseX, mouseY, centerX, centerY, offset } = params;
  
  if (offset === 0) {
    return { x: mouseX, y: mouseY };
  }

  const directionX = mouseX - centerX;
  const directionY = mouseY - centerY;
  const distance = VectorUtils.calculateDistance(mouseX, mouseY, centerX, centerY);

  if (distance === 0) {
    return { x: centerX + offset, y: centerY };
  }

  const normalized = VectorUtils.normalizeVector(directionX, directionY);
  const perceivedDistance = distance + offset;
  const perceivedX = centerX + normalized.x * perceivedDistance;
  const perceivedY = centerY + normalized.y * perceivedDistance;

  return { x: perceivedX, y: perceivedY };
};

const checkCornerActivity = (point: RectPoint, activeSides: Array<'top' | 'right' | 'bottom' | 'left'>): boolean => {
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

  return adjacentSides.every(side => activeSides.includes(side));
};

const applyCornerDampening = (params: {
  strength: number;
  isCorner: boolean;
  point: RectPoint;
  factor: number;
}): number => {
  const { strength, isCorner, point, factor } = params;
  
  if (isCorner) {
    return strength * factor;
  }

  const distanceFromCorner = Math.min(point.sidePosition, 1 - point.sidePosition);
  if (distanceFromCorner < MATH_CONSTANTS.CORNER_BLEND_FACTOR) {
    const normalizedDistance = distanceFromCorner / MATH_CONSTANTS.CORNER_BLEND_FACTOR;
    const smoothFactor = 1 - Math.pow(1 - normalizedDistance, MATH_CONSTANTS.POWER_OF_TWO);
    const cornerDampening = factor + (1 - factor) * smoothFactor;
    return strength * cornerDampening;
  }

  return strength;
};

const calculateDeformation = (params: {
  point: RectPoint;
  cursorX: number;
  cursorY: number;
  strength: number;
  mode: 'cursor' | 'surface-normal';
  isCorner: boolean;
}): { newX: number; newY: number; directionX: number; directionY: number } => {
  const { point, cursorX, cursorY, strength, mode, isCorner } = params;
  let directionX: number, directionY: number;

  if (mode === 'cursor') {
    const directionToCursor = VectorUtils.normalizeVector(cursorX - point.baseX, cursorY - point.baseY);
    directionX = directionToCursor.x;
    directionY = directionToCursor.y;
  } else {
    const surfaceNormal = calculateSurfaceNormal(point, isCorner);
    const pointToCursorDirection = VectorUtils.normalizeVector(cursorX - point.baseX, cursorY - point.baseY);
    const dotProduct = surfaceNormal.x * pointToCursorDirection.x + surfaceNormal.y * pointToCursorDirection.y;
    
    const directionalForce = dotProduct > 0 ? strength * dotProduct : 0;
    const newX = point.baseX + surfaceNormal.x * directionalForce;
    const newY = point.baseY + surfaceNormal.y * directionalForce;
    
    return { newX, newY, directionX: surfaceNormal.x, directionY: surfaceNormal.y };
  }

  const newX = point.baseX + directionX * strength;
  const newY = point.baseY + directionY * strength;
  
  return { newX, newY, directionX, directionY };
};

const preventInwardMovement = (params: {
  point: RectPoint;
  newX: number;
  newY: number;
  isCorner: boolean;
  config: PhysicsConfig;
}): { x: number; y: number } => {
  const { point, newX, newY, isCorner, config } = params;
  
  if (isCorner) {
    const rectCenterX = config.width / MATH_CONSTANTS.HALF;
    const rectCenterY = config.height / MATH_CONSTANTS.HALF;

    const isLeftCorner = point.baseX < rectCenterX;
    const isTopCorner = point.baseY < rectCenterY;

    let finalX = newX;
    let finalY = newY;

    if (isLeftCorner && newX > point.baseX) finalX = point.baseX;
    if (!isLeftCorner && newX < point.baseX) finalX = point.baseX;
    if (isTopCorner && newY > point.baseY) finalY = point.baseY;
    if (!isTopCorner && newY < point.baseY) finalY = point.baseY;

    return { x: finalX, y: finalY };
  }

  let finalX = newX;
  let finalY = newY;

  switch (point.side) {
    case 'top':
      if (newY > point.baseY) finalY = point.baseY;
      break;
    case 'right':
      if (newX < point.baseX) finalX = point.baseX;
      break;
    case 'bottom':
      if (newY < point.baseY) finalY = point.baseY;
      break;
    case 'left':
      if (newX > point.baseX) finalX = point.baseX;
      break;
  }

  return { x: finalX, y: finalY };
};

const getSortOrder = (point: RectPoint): number => {
  if (point.side === 'top' && point.sidePosition === 0) return MATH_CONSTANTS.SORT_ORDER_TOP_CORNER;
  if (point.side === 'top') return MATH_CONSTANTS.SORT_ORDER_TOP;
  if (point.side === 'right') return MATH_CONSTANTS.SORT_ORDER_RIGHT;
  if (point.side === 'bottom') return MATH_CONSTANTS.SORT_ORDER_BOTTOM;
  if (point.side === 'left') return MATH_CONSTANTS.SORT_ORDER_LEFT;
  return MATH_CONSTANTS.SORT_ORDER_DEFAULT;
};

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
  stretchiness = DEFAULT_PHYSICS.stretchiness,
  minDistance = DEFAULT_PHYSICS.minDistance,
  perceivedCursorOffset = DEFAULT_PHYSICS.perceivedCursorOffset,
  cornerDeflectionFactor = 0.2,
  deformationMode = 'surface-normal',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInside, setIsInside] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  
  const [measuredDimensions, setMeasuredDimensions] = useState<{ width: number; height: number } | null>(null);
  
  const width = propWidth ?? measuredDimensions?.width ?? 0;
  const height = propHeight ?? measuredDimensions?.height ?? 0;

  const physicsConfig: PhysicsConfig = {
    ...DEFAULT_PHYSICS,
    width,
    height,
    stretchiness,
    minDistance,
    perceivedCursorOffset
  };

  const isPointInCurrentShape = useCallback((x: number, y: number): boolean => {
    if (!svgRef.current || !pathRef.current || !currentPath) return false;

    const rect = svgRef.current.getBoundingClientRect();
    const svgX = x - rect.left;
    const svgY = y - rect.top;

    const localX = (svgX / rect.width) * width;
    const localY = (svgY / rect.height) * height;

    const point = svgRef.current.createSVGPoint();
    point.x = localX;
    point.y = localY;

    try {
      return pathRef.current.isPointInFill(point);
    } catch {
      return localX >= 0 && localX <= width && localY >= 0 && localY <= height;
    }
  }, [currentPath, width, height]);

  const generateLavaPath = useCallback((params: {
    mouseX: number;
    mouseY: number;
    centerX: number;
    centerY: number;
    strength: number;
    effectiveDistance: number;
  }): string => {
    const { mouseX, mouseY, centerX, centerY, strength: pathStrength, effectiveDistance } = params;
    const points = generateRectanglePoints({
      dimensions: { width, height },
      activeSides,
      pointsPerSide
    });
    
    if (!svgRef.current || points.length === 0) return '';

    const svgCenterX = width / MATH_CONSTANTS.HALF;
    const svgCenterY = height / MATH_CONSTANTS.HALF;

    const perceivedCursor = calculatePerceivedCursor({
      mouseX,
      mouseY,
      centerX,
      centerY,
      offset: perceivedCursorOffset
    });
    
    const cursorSvgX = CoordinateUtils.screenToSvg(perceivedCursor.x, centerX, svgCenterX);
    const cursorSvgY = CoordinateUtils.screenToSvg(perceivedCursor.y, centerY, svgCenterY);

    const transformedPoints = points.map(point => {
      const isActive = activeSides.includes(point.side);
      const isCornerPoint = (point.sidePosition === 0 || point.sidePosition === 1);

      if (isCornerPoint) {
        const cornerIsActive = checkCornerActivity(point, activeSides);
        if (!cornerIsActive) {
          return { ...point };
        }
      } else if (!isActive) {
        return { ...point };
      }

      const pointScreenX = centerX + (point.baseX - svgCenterX);
      const pointScreenY = centerY + (point.baseY - svgCenterY);

      const rawPointDistance = VectorUtils.calculateDistance(
        perceivedCursor.x, 
        perceivedCursor.y, 
        pointScreenX, 
        pointScreenY
      );
      const pointDistanceToMouse = Math.max(rawPointDistance, physicsConfig.minDistance);

      const baseMagneticForce = PhysicsUtils.calculateBaseMagneticForce(pointDistanceToMouse, effectiveDistance);
      let attractionStrength = baseMagneticForce * pathStrength;

      attractionStrength = applyCornerDampening({
        strength: attractionStrength,
        isCorner: isCornerPoint,
        point,
        factor: cornerDeflectionFactor
      });

      const { newX, newY, directionX, directionY } = calculateDeformation({
        point,
        cursorX: cursorSvgX,
        cursorY: cursorSvgY,
        strength: attractionStrength,
        mode: deformationMode,
        isCorner: isCornerPoint
      });

      const stretchAmount = PhysicsUtils.calculateStretch(baseMagneticForce, pathStrength, physicsConfig);
      let finalX = newX;
      let finalY = newY;
      
      if (stretchAmount > 0) {
        finalX += directionX * stretchAmount;
        finalY += directionY * stretchAmount;
      }

      const preventedMovement = preventInwardMovement({
        point,
        newX: finalX,
        newY: finalY,
        isCorner: isCornerPoint,
        config: physicsConfig
      });

      return { ...point, x: preventedMovement.x, y: preventedMovement.y };
    });

    const sortedPoints = transformedPoints.sort((a, b) => {
      const orderA = getSortOrder(a);
      const orderB = getSortOrder(b);

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
  }, [width, height, activeSides, pointsPerSide, perceivedCursorOffset, physicsConfig, cornerDeflectionFactor, deformationMode]);

  const calculateMagneticEffect = useCallback((mouseX: number, mouseY: number) => {
    if (!containerRef.current || !svgRef.current) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    const rectCenterX = svgRect.left + svgRect.width / MATH_CONSTANTS.HALF;
    const rectCenterY = svgRect.top + svgRect.height / MATH_CONSTANTS.HALF;

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
      const newPath = generateLavaPath({
        mouseX,
        mouseY,
        centerX: rectCenterX,
        centerY: rectCenterY,
        strength,
        effectiveDistance
      });

      setCurrentPath(newPath);

      if (pathRef.current) {
        gsap.to(pathRef.current, {
          attr: { d: newPath },
          duration: duration * MATH_CONSTANTS.DURATION_MULTIPLIER,
          ease: ease
        });
      }
    } else {
      const basePath = generateLavaPath({
        mouseX: rectCenterX + MATH_CONSTANTS.FAR_AWAY_DISTANCE,
        mouseY: rectCenterY + MATH_CONSTANTS.FAR_AWAY_DISTANCE,
        centerX: rectCenterX,
        centerY: rectCenterY,
        strength: 0,
        effectiveDistance
      });

      setCurrentPath(basePath);

      if (pathRef.current) {
        gsap.to(pathRef.current, {
          attr: { d: basePath },
          duration: duration,
          ease: ease
        });
      }
    }
  }, [isPointInCurrentShape, isInside, onCursorInside, fullWindow, distance, generateLavaPath, strength, duration, ease]);

  useLayoutEffect(() => {
    if (containerRef.current && !propWidth && !propHeight && !measuredDimensions) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setMeasuredDimensions({ width: rect.width, height: rect.height });
      }
    }
  }, [propWidth, propHeight, measuredDimensions]);

  useEffect(() => {
    if (!containerRef.current || (propWidth !== undefined && propHeight !== undefined)) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: measuredWidth, height: measuredHeight } = entry.contentRect;
        
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
  }, [calculateMagneticEffect, onMouseMove, width, height]);

  useEffect(() => {
    if (pathRef.current && svgRef.current && width > 0 && height > 0) {
      const svgCenterX = width / MATH_CONSTANTS.HALF;
      const svgCenterY = height / MATH_CONSTANTS.HALF;

      const initialPath = generateLavaPath({
        mouseX: svgCenterX + MATH_CONSTANTS.FAR_AWAY_DISTANCE,
        mouseY: svgCenterY + MATH_CONSTANTS.FAR_AWAY_DISTANCE,
        centerX: svgCenterX,
        centerY: svgCenterY,
        strength: 0,
        effectiveDistance: MATH_CONSTANTS.FAR_AWAY_DISTANCE
      });

      pathRef.current.setAttribute('d', initialPath);
      setCurrentPath(initialPath);
    }
  }, [width, height, generateLavaPath]);

  if (width <= 0 || height <= 0) {
    return (
      <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }} />
    );
  }

  return (
    <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', ...style }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
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
