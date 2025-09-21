import { gsap } from 'gsap';
import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';

import {
  type RectPoint,
  type PhysicsConfig as BasePhysicsConfig,
  VectorUtils,
  PhysicsUtils,
  generateRectanglePoints,
  getSortOrder,
  calculateDistanceToRectangleBoundary,
  calculateDistanceBasedStrength
} from '../utils/rectanglePhysics';

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
interface PhysicsConfig extends BasePhysicsConfig {
  // Additional properties specific to this component can be added here
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

type ClampCornerArgs = { point: RectPoint; newX: number; newY: number; rectCenterX: number; rectCenterY: number };
const clampCornerMovement = ({ point, newX, newY, rectCenterX, rectCenterY }: ClampCornerArgs) => {
  const isLeftCorner = point.baseX < rectCenterX;
  const isTopCorner = point.baseY < rectCenterY;
  return {
    x: (isLeftCorner && newX > point.baseX) || (!isLeftCorner && newX < point.baseX) ? point.baseX : newX,
    y: (isTopCorner && newY > point.baseY) || (!isTopCorner && newY < point.baseY) ? point.baseY : newY
  };
};

const clampSideMovement = (point: RectPoint, nx: number, ny: number) => {
  switch (point.side) {
    case 'top':
      return { x: nx, y: Math.min(ny, point.baseY) };
    case 'right':
      return { x: Math.max(nx, point.baseX), y: ny };
    case 'bottom':
      return { x: nx, y: Math.max(ny, point.baseY) };
    case 'left':
      return { x: Math.min(nx, point.baseX), y: ny };
    default:
      return { x: nx, y: ny };
  }
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
    return clampCornerMovement({ point, newX, newY, rectCenterX, rectCenterY });
  }
  const clamped = clampSideMovement(point, newX, newY);
  return { x: clamped.x, y: clamped.y };
};


type TransformContext = {
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  physicsConfig: PhysicsConfig;
  perceivedCursor: { x: number; y: number };
  svgCenterX: number;
  svgCenterY: number;
  centerX: number;
  centerY: number;
  pathStrength: number;
  cornerDeflectionFactor: number;
  deformationMode: 'cursor' | 'surface-normal';
  effectiveDistance: number;
};

const computeAttraction = (point: RectPoint, isCornerPoint: boolean, ctx: TransformContext) => {
  const { perceivedCursor, svgCenterX, svgCenterY, centerX, centerY, physicsConfig, pathStrength, cornerDeflectionFactor, deformationMode, effectiveDistance } = ctx;
  const pointScreenX = centerX + (point.baseX - svgCenterX);
  const pointScreenY = centerY + (point.baseY - svgCenterY);
  const rawPointDistance = VectorUtils.calculateDistance(perceivedCursor.x, perceivedCursor.y, pointScreenX, pointScreenY);
  const pointDistanceToMouse = Math.max(rawPointDistance, physicsConfig.minDistance);
  const baseMagneticForce = PhysicsUtils.calculateBaseMagneticForce(pointDistanceToMouse, effectiveDistance);
  let attractionStrength = baseMagneticForce * pathStrength;
  attractionStrength = applyCornerDampening({ strength: attractionStrength, isCorner: isCornerPoint, point, factor: cornerDeflectionFactor });
  const { newX, newY, directionX, directionY } = calculateDeformation({
    point,
    cursorX: perceivedCursor.x - centerX + svgCenterX,
    cursorY: perceivedCursor.y - centerY + svgCenterY,
    strength: attractionStrength,
    mode: deformationMode,
    isCorner: isCornerPoint
  });
  const stretchAmount = PhysicsUtils.calculateStretch(baseMagneticForce, pathStrength, physicsConfig);
  return {
    x: stretchAmount > 0 ? newX + directionX * stretchAmount : newX,
    y: stretchAmount > 0 ? newY + directionY * stretchAmount : newY
  };
};

const transformPoint = (point: RectPoint, ctx: TransformContext): RectPoint => {
  const { activeSides, physicsConfig } = ctx;

  const isActive = activeSides.includes(point.side);
  const isCornerPoint = point.sidePosition === 0 || point.sidePosition === 1;

  if (isCornerPoint) {
    const cornerIsActive = checkCornerActivity(point, activeSides);
    if (!cornerIsActive) return { ...point };
  } else if (!isActive) {
    return { ...point };
  }

  const { x: adjX, y: adjY } = computeAttraction(point, isCornerPoint, ctx);
  const prevented = preventInwardMovement({
    point,
    newX: adjX,
    newY: adjY,
    isCorner: isCornerPoint,
    config: physicsConfig
  });
  return { ...point, x: prevented.x, y: prevented.y };
};

const buildPathFromPoints = (points: RectPoint[]): string => {
  if (points.length === 0) return '';
  let path = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x},${points[i].y}`;
  }
  return path + ' Z';
};

const computeEffectiveDistance = (
  fullWindow: boolean,
  rectCenterX: number,
  rectCenterY: number,
  distance: number
): number => fullWindow
    ? Math.max(rectCenterX, window.innerWidth - rectCenterX, rectCenterY, window.innerHeight - rectCenterY)
    : distance;

type AnimateArgs = { el: SVGPathElement; d: string; duration: number; ease: string; multiplier?: number };
const animatePath = ({ el, d, duration, ease, multiplier = 1 }: AnimateArgs) => {
  gsap.to(el, {
    attr: { d },
    duration: duration * multiplier,
    ease
  });
};

// Hooks to reduce component size/complexity
const useMeasuredRect = (
  containerRef: React.RefObject<HTMLDivElement>,
  propWidth?: number,
  propHeight?: number
) => {
  const [measured, setMeasured] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    if (containerRef.current && !propWidth && !propHeight && !measured) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setMeasured({ width: rect.width, height: rect.height });
      }
    }
  }, [containerRef, propWidth, propHeight, measured]);

  useEffect(() => {
    if (!containerRef.current || (propWidth !== undefined && propHeight !== undefined)) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setMeasured({ width, height });
      }
    });

    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [containerRef, propWidth, propHeight]);

  return {
    width: propWidth ?? measured?.width ?? 0,
    height: propHeight ?? measured?.height ?? 0
  };
};

interface LavaPathGeneratorConfig {
  width: number;
  height: number;
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  pointsPerSide: number;
  perceivedCursorOffset: number;
  physicsConfig: PhysicsConfig;
  cornerDeflectionFactor: number;
  deformationMode: 'cursor' | 'surface-normal';
  svgRef: React.RefObject<SVGSVGElement>;
}

const useLavaPathGenerator = (config: LavaPathGeneratorConfig) => useCallback((params: {
    mouseX: number;
    mouseY: number;
    centerX: number;
    centerY: number;
    strength: number;
    effectiveDistance: number;
  }): string => {
    const { width, height, activeSides, pointsPerSide, perceivedCursorOffset, physicsConfig, cornerDeflectionFactor, deformationMode, svgRef } = config;
    const { mouseX, mouseY, centerX, centerY, strength, effectiveDistance } = params;
    const points = generateRectanglePoints({
      dimensions: { width, height },
      activeSides,
      pointsPerSide
    });
    
    if (!svgRef.current || points.length === 0) return '';

    const ctx: TransformContext = {
      activeSides,
      physicsConfig,
      perceivedCursor: calculatePerceivedCursor({ mouseX, mouseY, centerX, centerY, offset: perceivedCursorOffset }),
      svgCenterX: width / MATH_CONSTANTS.HALF,
      svgCenterY: height / MATH_CONSTANTS.HALF,
      centerX,
      centerY,
      pathStrength: strength,
      cornerDeflectionFactor,
      deformationMode,
      effectiveDistance
    };
    const transformedPoints = points.map((point) => transformPoint(point, ctx));

    const sortedPoints = transformedPoints.sort((a, b) => {
      const orderA = getSortOrder(a);
      const orderB = getSortOrder(b);

      if (orderA !== orderB) return orderA - orderB;
      return a.sidePosition - b.sidePosition;
    });

    if (sortedPoints.length === 0) return '';
    return buildPathFromPoints(sortedPoints);
  }, [config]);

interface ShapeDetectionConfig {
  svgRef: React.RefObject<SVGSVGElement>;
  pathRef: React.RefObject<SVGPathElement>;
  currentPath: string;
  width: number;
  height: number;
}

const useShapeDetection = (config: ShapeDetectionConfig) => useCallback((x: number, y: number): boolean => {
    const { svgRef, pathRef, currentPath, width, height } = config;
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
  }, [config]);

const useInsideDetection = (
  isPointInCurrentShape: (x: number, y: number) => boolean,
  isInside: boolean,
  setIsInside: React.Dispatch<React.SetStateAction<boolean>>,
  onCursorInside?: (isInside: boolean) => void
) => useCallback((mouseX: number, mouseY: number) => {
    const currentlyInside = isPointInCurrentShape(mouseX, mouseY);
    if (currentlyInside !== isInside) {
      setIsInside(currentlyInside);
      onCursorInside?.(currentlyInside);
    }
  }, [isPointInCurrentShape, isInside, setIsInside, onCursorInside]);

const usePathAnimation = (
  pathRef: React.RefObject<SVGPathElement>,
  setCurrentPath: React.Dispatch<React.SetStateAction<string>>,
  duration: number,
  ease: string
) => useCallback((path: string, isActive: boolean) => {
    setCurrentPath(path);
    if (pathRef.current) {
      const multiplier = isActive ? MATH_CONSTANTS.DURATION_MULTIPLIER : 1;
      animatePath({ el: pathRef.current, d: path, duration, ease, multiplier });
    }
  }, [pathRef, setCurrentPath, duration, ease]);

const useMagneticEffect = (config: {
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<SVGSVGElement>;
  handleInsideDetection: (x: number, y: number) => void;
  animatePath: (path: string, isActive: boolean) => void;
  generateLavaPath: (params: {
    mouseX: number;
    mouseY: number;
    centerX: number;
    centerY: number;
    strength: number;
    effectiveDistance: number;
  }) => string;
  fullWindow: boolean;
  distance: number;
  strength: number;
  width: number;
  height: number;
}) => useCallback((mouseX: number, mouseY: number) => {
    const { containerRef, svgRef, handleInsideDetection, animatePath, generateLavaPath, fullWindow, distance, strength, width: _width, height: _height } = config;
    
    if (!containerRef.current || !svgRef.current) return;

    const svgRect = svgRef.current.getBoundingClientRect();
    const rectCenterX = svgRect.left + svgRect.width / MATH_CONSTANTS.HALF;
    const rectCenterY = svgRect.top + svgRect.height / MATH_CONSTANTS.HALF;

    handleInsideDetection(mouseX, mouseY);

    // Calculate distance to rectangle boundary (negative when inside, positive when outside)
    const distanceToBoundary = calculateDistanceToRectangleBoundary({
      cursorX: mouseX,
      cursorY: mouseY,
      rectX: svgRect.left,
      rectY: svgRect.top,
      rectWidth: svgRect.width,
      rectHeight: svgRect.height
    });

    // Calculate distance-based strength (0 when inside, smooth transition when outside)
    const effectiveStrength = calculateDistanceBasedStrength(distanceToBoundary, strength);

    const actualDistance = VectorUtils.calculateDistance(mouseX, mouseY, rectCenterX, rectCenterY);
    const effectiveDistance = computeEffectiveDistance(fullWindow, rectCenterX, rectCenterY, distance);
    const isActive = fullWindow || actualDistance < distance;

    const pathParams = {
      mouseX: isActive ? mouseX : rectCenterX + MATH_CONSTANTS.FAR_AWAY_DISTANCE,
      mouseY: isActive ? mouseY : rectCenterY + MATH_CONSTANTS.FAR_AWAY_DISTANCE,
      centerX: rectCenterX,
      centerY: rectCenterY,
      strength: isActive ? effectiveStrength : 0,
      effectiveDistance
    };

    const newPath = generateLavaPath(pathParams);
    animatePath(newPath, isActive);
  }, [config]);

const useGlobalListeners = (
  width: number,
  height: number,
  calculateMagneticEffect: (x: number, y: number) => void,
  onMouseMove?: (e: MouseEvent) => void
) => {
  const handleGlobalMouseMove = useCallback(
    (e: MouseEvent) => {
      if (width > 0 && height > 0) {
        calculateMagneticEffect(e.clientX, e.clientY);
      }
      onMouseMove?.(e);
    },
    [width, height, calculateMagneticEffect, onMouseMove]
  );

  const handleScroll = useCallback(() => {
    if (width > 0 && height > 0) {
      calculateMagneticEffect(0, 0);
    }
  }, [width, height, calculateMagneticEffect]);

  useEffect(() => {
    document.addEventListener('mousemove', handleGlobalMouseMove);
    document.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleGlobalMouseMove, handleScroll]);
};

type InitialPathArgs = {
  svgRef: React.RefObject<SVGSVGElement>;
  pathRef: React.RefObject<SVGPathElement>;
  width: number;
  height: number;
  generateLavaPath: (p: {
    mouseX: number;
    mouseY: number;
    centerX: number;
    centerY: number;
    strength: number;
    effectiveDistance: number;
  }) => string;
  setCurrentPath: React.Dispatch<React.SetStateAction<string>>;
};
const useInitialPath = ({
  svgRef,
  pathRef,
  width,
  height,
  generateLavaPath,
  setCurrentPath
}: InitialPathArgs) => {
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
  }, [svgRef, pathRef, width, height, generateLavaPath, setCurrentPath]);
};

const useRectangleRefs = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInside, setIsInside] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  return { svgRef, pathRef, containerRef, isInside, setIsInside, currentPath, setCurrentPath };
};

const usePhysicsSetup = (props: MagneticLavaRectangleProps, refs: ReturnType<typeof useRectangleRefs>) => {
  const { width: propWidth, height: propHeight, stretchiness = DEFAULT_PHYSICS.stretchiness, minDistance = DEFAULT_PHYSICS.minDistance, perceivedCursorOffset = DEFAULT_PHYSICS.perceivedCursorOffset } = props;
  const { containerRef } = refs;
  
  const { width, height } = useMeasuredRect(containerRef, propWidth, propHeight);
  
  const physicsConfig: PhysicsConfig = React.useMemo(() => ({
    ...DEFAULT_PHYSICS,
    width,
    height,
    stretchiness,
    minDistance,
    perceivedCursorOffset
  }), [width, height, stretchiness, minDistance, perceivedCursorOffset]);

  return { width, height, physicsConfig };
};

const useMagneticRectangleLogic = (props: MagneticLavaRectangleProps) => {
  const { activeSides, pointsPerSide = 20, strength, distance, duration, ease, fullWindow = false, onCursorInside, onMouseMove, cornerDeflectionFactor = 0.2, deformationMode = 'surface-normal', perceivedCursorOffset = DEFAULT_PHYSICS.perceivedCursorOffset } = props;
  
  const refs = useRectangleRefs();
  const { svgRef, pathRef, containerRef, isInside, setIsInside, currentPath, setCurrentPath } = refs;
  const { width, height, physicsConfig } = usePhysicsSetup(props, refs);

  const generateLavaPath = useLavaPathGenerator({
    width,
    height,
    activeSides,
    pointsPerSide,
    perceivedCursorOffset,
    physicsConfig,
    cornerDeflectionFactor,
    deformationMode,
    svgRef
  });

  const isPointInCurrentShape = useShapeDetection({
    svgRef,
    pathRef,
    currentPath,
    width,
    height
  });
  const handleInsideDetection = useInsideDetection(isPointInCurrentShape, isInside, setIsInside, onCursorInside);
  const animatePathWithState = usePathAnimation(pathRef, setCurrentPath, duration, ease);

  const calculateMagneticEffect = useMagneticEffect({
    containerRef, svgRef, handleInsideDetection, animatePath: animatePathWithState,
    generateLavaPath, fullWindow, distance, strength, width, height
  });

  useGlobalListeners(width, height, calculateMagneticEffect, onMouseMove);
  useInitialPath({ svgRef, pathRef, width, height, generateLavaPath, setCurrentPath });

  return { svgRef, pathRef, containerRef, width, height };
};

export const MagneticLavaRectangle: React.FC<MagneticLavaRectangleProps> = (props) => {
  const { fill, className = '', style = {} } = props;
  const { svgRef, pathRef, containerRef, width, height } = useMagneticRectangleLogic(props);

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
