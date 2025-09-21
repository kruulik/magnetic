import { gsap } from 'gsap';
import { useCallback, useMemo, useRef, useState } from 'react';

import {
  type RectPoint,
  VectorUtils,
  generateRectanglePoints,
  getSortOrder
} from '../utils/rectanglePhysics';

const MATH_CONSTANTS = {
  HALF: 0.5,
  POWER_OF_TWO: 2,
  FAR_AWAY_DISTANCE: 1000,
  DURATION_MULTIPLIER: 0.3
} as const;

interface PhysicsConfig {
  width: number;
  height: number;
  stretchiness: number;
  minDistance: number;
  perceivedCursorOffset: number;
}

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

const createPointInShapeChecker = (config: {
  svgRef: React.RefObject<SVGSVGElement>;
  pathRef: React.RefObject<SVGPathElement>;
  currentPath: string;
  width: number;
  height: number;
}) => (x: number, y: number): boolean => {
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
};

const createTransformContext = (config: {
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  physicsConfig: PhysicsConfig;
  width: number;
  height: number;
  perceivedCursorOffset: number;
  cornerDeflectionFactor: number;
  deformationMode: 'cursor' | 'surface-normal';
}, pathParams: {
  mouseX: number;
  mouseY: number;
  centerX: number;
  centerY: number;
  strength: number;
  effectiveDistance: number;
}): TransformContext => {
  const { activeSides, physicsConfig, width, height, perceivedCursorOffset, cornerDeflectionFactor, deformationMode } = config;
  const { mouseX, mouseY, centerX, centerY, strength: pathStrength, effectiveDistance } = pathParams;

  return {
    activeSides,
    physicsConfig,
    perceivedCursor: calculatePerceivedCursor({ mouseX, mouseY, centerX, centerY, offset: perceivedCursorOffset }),
    svgCenterX: width / MATH_CONSTANTS.HALF,
    svgCenterY: height / MATH_CONSTANTS.HALF,
    centerX,
    centerY,
    pathStrength,
    cornerDeflectionFactor,
    deformationMode,
    effectiveDistance
  };
};

const createLavaPathGenerator = (config: {
  width: number;
  height: number;
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  pointsPerSide: number;
  perceivedCursorOffset: number;
  physicsConfig: PhysicsConfig;
  cornerDeflectionFactor: number;
  deformationMode: 'cursor' | 'surface-normal';
  svgRef: React.RefObject<SVGSVGElement>;
}) => (pathParams: {
  mouseX: number;
  mouseY: number;
  centerX: number;
  centerY: number;
  strength: number;
  effectiveDistance: number;
}): string => {
  const { width, height, activeSides, pointsPerSide, svgRef } = config;
  const points = generateRectanglePoints({
    dimensions: { width, height },
    activeSides,
    pointsPerSide
  });
  
  if (!svgRef.current || points.length === 0) return '';

  const _ctx = createTransformContext(config, pathParams);
  const transformedPoints = points;

  const sortedPoints = transformedPoints.sort((a, b) => {
    const orderA = getSortOrder(a);
    const orderB = getSortOrder(b);
    if (orderA !== orderB) return orderA - orderB;
    return a.sidePosition - b.sidePosition;
  });

  if (sortedPoints.length === 0) return '';
  return buildPathFromPoints(sortedPoints);
};

type LavaPathParams = {
  mouseX: number;
  mouseY: number;
  centerX: number;
  centerY: number;
  strength: number;
  effectiveDistance: number;
};

const useActivePathHandler = (config: {
  generateLavaPath: (params: LavaPathParams) => string;
  pathRef: React.RefObject<SVGPathElement>;
  setCurrentPath: (path: string) => void;
  strength: number;
  duration: number;
  ease: string;
}) => {
  const { generateLavaPath, pathRef, setCurrentPath, strength, duration, ease } = config;

  return useCallback((params: {
    mouseX: number;
    mouseY: number;
    rectCenterX: number;
    rectCenterY: number;
    effectiveDistance: number;
  }) => {
    const { mouseX, mouseY, rectCenterX, rectCenterY, effectiveDistance } = params;
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
      animatePath({ 
        el: pathRef.current, 
        d: newPath, 
        duration, 
        ease, 
        multiplier: MATH_CONSTANTS.DURATION_MULTIPLIER 
      });
    }
  }, [generateLavaPath, strength, duration, ease, pathRef, setCurrentPath]);
};

const useInactivePathHandler = (config: {
  generateLavaPath: (params: LavaPathParams) => string;
  pathRef: React.RefObject<SVGPathElement>;
  setCurrentPath: (path: string) => void;
  duration: number;
  ease: string;
}) => {
  const { generateLavaPath, pathRef, setCurrentPath, duration, ease } = config;

  return useCallback((
    rectCenterX: number,
    rectCenterY: number,
    effectiveDistance: number
  ) => {
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
      animatePath({ el: pathRef.current, d: basePath, duration, ease });
    }
  }, [generateLavaPath, duration, ease, pathRef, setCurrentPath]);
};

const usePathApplication = (config: {
  generateLavaPath: (params: LavaPathParams) => string;
  pathRef: React.RefObject<SVGPathElement>;
  setCurrentPath: (path: string) => void;
  strength: number;
  duration: number;
  ease: string;
}) => {
  const applyActivePath = useActivePathHandler(config);
  const applyInactivePath = useInactivePathHandler(config);

  return { applyActivePath, applyInactivePath };
};

type MagneticEffectParams = {
  mouseX: number;
  mouseY: number;
  rectCenterX: number;
  rectCenterY: number;
  effectiveDistance: number;
};

const handleMagneticEffectLogic = (params: {
  mouseX: number;
  mouseY: number;
  isPointInCurrentShape: (x: number, y: number) => boolean;
  handleInsideStateChange: (inside: boolean) => void;
  fullWindow: boolean;
  distance: number;
  applyActivePath: (params: MagneticEffectParams) => void;
  applyInactivePath: (x: number, y: number, dist: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<SVGSVGElement>;
}) => {
  const {
    mouseX,
    mouseY,
    isPointInCurrentShape,
    handleInsideStateChange,
    fullWindow,
    distance,
    applyActivePath,
    applyInactivePath,
    containerRef,
    svgRef
  } = params;
  if (!containerRef.current || !svgRef.current) return;

  const svgRect = svgRef.current.getBoundingClientRect();
  const rectCenterX = svgRect.left + svgRect.width / MATH_CONSTANTS.HALF;
  const rectCenterY = svgRect.top + svgRect.height / MATH_CONSTANTS.HALF;

  const currentlyInside = isPointInCurrentShape(mouseX, mouseY);
  handleInsideStateChange(currentlyInside);

  const actualDistance = VectorUtils.calculateDistance(mouseX, mouseY, rectCenterX, rectCenterY);
  const effectiveDistance = computeEffectiveDistance(fullWindow, rectCenterX, rectCenterY, distance);

  const isActive = fullWindow || actualDistance < distance;

  if (isActive) {
    applyActivePath({ mouseX, mouseY, rectCenterX, rectCenterY, effectiveDistance });
  } else {
    applyInactivePath(rectCenterX, rectCenterY, effectiveDistance);
  }
};

const useMagneticEffect = (config: {
  isPointInCurrentShape: (x: number, y: number) => boolean;
  handleInsideStateChange: (inside: boolean) => void;
  fullWindow: boolean;
  distance: number;
  applyActivePath: (params: MagneticEffectParams) => void;
  applyInactivePath: (x: number, y: number, dist: number) => void;
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<SVGSVGElement>;
}) => {
  const {
    isPointInCurrentShape,
    handleInsideStateChange,
    fullWindow,
    distance,
    applyActivePath,
    applyInactivePath,
    containerRef,
    svgRef
  } = config;

  return useCallback((mouseX: number, mouseY: number) => {
    handleMagneticEffectLogic({
      mouseX,
      mouseY,
      isPointInCurrentShape,
      handleInsideStateChange,
      fullWindow,
      distance,
      applyActivePath,
      applyInactivePath,
      containerRef,
      svgRef
    });
  }, [isPointInCurrentShape, handleInsideStateChange, fullWindow, distance, applyActivePath, applyInactivePath, containerRef, svgRef]);
};

const useRectangleRefs = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInside, setIsInside] = useState(false);
  const [currentPath, setCurrentPath] = useState('');

  return { svgRef, pathRef, containerRef, isInside, setIsInside, currentPath, setCurrentPath };
};

type MagneticRectangleParams = {
  width: number;
  height: number;
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  pointsPerSide: number;
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  onCursorInside?: (isInside: boolean) => void;
  onMouseMove?: (e: MouseEvent) => void;
  stretchiness: number;
  minDistance: number;
  perceivedCursorOffset: number;
  cornerDeflectionFactor: number;
  deformationMode: 'cursor' | 'surface-normal';
};

const useBasicRectangleSetup = (params: MagneticRectangleParams) => {
  const {
    width, height, stretchiness, minDistance, perceivedCursorOffset, onCursorInside
  } = params;

  const { svgRef, pathRef, containerRef, isInside, setIsInside, currentPath, setCurrentPath } = useRectangleRefs();

  const physicsConfig: PhysicsConfig = useMemo(() => ({
    width, height, stretchiness, minDistance, perceivedCursorOffset
  }), [width, height, stretchiness, minDistance, perceivedCursorOffset]);

  const handleInsideStateChange = useCallback((currentlyInside: boolean) => {
    if (currentlyInside !== isInside) {
      setIsInside(currentlyInside);
      onCursorInside?.(currentlyInside);
    }
  }, [isInside, onCursorInside, setIsInside]);

  return {
    svgRef, pathRef, containerRef, isInside, setIsInside, currentPath, setCurrentPath,
    physicsConfig, handleInsideStateChange
  };
};

const useMagneticRectangleHooks = (params: MagneticRectangleParams) => {
  const { width, height, activeSides, pointsPerSide, perceivedCursorOffset, cornerDeflectionFactor, deformationMode } = params;
  const setup = useBasicRectangleSetup(params);

  const isPointInCurrentShape = useMemo(
    () => createPointInShapeChecker({ svgRef: setup.svgRef, pathRef: setup.pathRef, currentPath: setup.currentPath, width, height }),
    [setup.currentPath, width, height, setup.svgRef, setup.pathRef]
  );

  const generateLavaPath = useMemo(
    () => createLavaPathGenerator({
      width, height, activeSides, pointsPerSide, perceivedCursorOffset,
      physicsConfig: setup.physicsConfig, cornerDeflectionFactor, deformationMode, svgRef: setup.svgRef
    }),
    [width, height, activeSides, pointsPerSide, perceivedCursorOffset, setup.physicsConfig, cornerDeflectionFactor, deformationMode, setup.svgRef]
  );

  return {
    svgRef: setup.svgRef, pathRef: setup.pathRef, containerRef: setup.containerRef,
    generateLavaPath, handleInsideStateChange: setup.handleInsideStateChange,
    isPointInCurrentShape, setCurrentPath: setup.setCurrentPath, currentPath: setup.currentPath
  };
};

const useMagneticRectangleLogic = (params: MagneticRectangleParams) => {
  const { strength, distance, duration, ease, fullWindow } = params;
  const hooks = useMagneticRectangleHooks(params);
  
  return { ...hooks, strength, duration, ease, fullWindow, distance };
};

export const useMagneticRectangle = (params: MagneticRectangleParams) => {
  const logic = useMagneticRectangleLogic(params);
  const { applyActivePath, applyInactivePath } = usePathApplication({
    generateLavaPath: logic.generateLavaPath,
    pathRef: logic.pathRef,
    setCurrentPath: logic.setCurrentPath,
    strength: logic.strength,
    duration: logic.duration,
    ease: logic.ease
  });

  const calculateMagneticEffect = useMagneticEffect({
    isPointInCurrentShape: logic.isPointInCurrentShape,
    handleInsideStateChange: logic.handleInsideStateChange,
    fullWindow: logic.fullWindow,
    distance: logic.distance,
    applyActivePath,
    applyInactivePath,
    containerRef: logic.containerRef,
    svgRef: logic.svgRef
  });

  return {
    svgRef: logic.svgRef,
    pathRef: logic.pathRef,
    containerRef: logic.containerRef,
    calculateMagneticEffect,
    currentPath: logic.currentPath,
    setCurrentPath: logic.setCurrentPath,
    generateLavaPath: logic.generateLavaPath
  };
};
