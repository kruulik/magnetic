import { gsap } from 'gsap';
import { useEffect, useRef, RefObject, useMemo } from 'react';

import { MagneticConfig } from '../utils/types';

// Constants to replace magic numbers
const MATH_CONSTANTS = {
  HALF: 0.5,
  POWER_OF_TWO: 2,
  POWER_OF_THREE: 3,
  CLOSE_DISTANCE_THRESHOLD: 3,
  MOVEMENT_THRESHOLD: 5,
  BASE_MOVEMENT_MULTIPLIER: 40,
  EXPONENTIAL_DIVISOR: 100,
  PERCENTAGE_MULTIPLIER: 0.8,
  DISTANCE_SCALE_FACTOR: 0.2,
} as const;

const defaultConfig: Required<MagneticConfig> = {
  strength: 0.3,
  distance: 100,
  duration: 0.4,
  ease: 'power2.out',
  debug: false,
  fullWindow: false,
  equation: 'exponential-plus'
};

const calculateDistance = (mouseX: number, mouseY: number, centerX: number, centerY: number): number =>
  Math.sqrt(
    Math.pow(mouseX - centerX, MATH_CONSTANTS.POWER_OF_TWO) + 
    Math.pow(mouseY - centerY, MATH_CONSTANTS.POWER_OF_TWO)
  );

const calculateEffectiveDistance = (
  fullWindow: boolean, 
  distance: number, 
  centerX: number, 
  centerY: number
): number => {
  if (!fullWindow) return distance;
  
  return Math.max(
    centerX, 
    window.innerWidth - centerX, 
    centerY, 
    window.innerHeight - centerY
  );
};

const calculateMagneticForce = (distance: number, effectiveDistance: number, strength: number): number => {
  const normalizedDistance = distance / effectiveDistance;
  const magneticForce = Math.pow(1 - Math.min(normalizedDistance, 1), MATH_CONSTANTS.POWER_OF_THREE);
  return magneticForce * strength;
};

const calculateOriginalMovement = (
  directionX: number, 
  directionY: number, 
  attractionStrength: number
): [number, number] => [
  directionX * attractionStrength,
  directionY * attractionStrength
];

const calculateCappedMovement = (
  distance: number,
  directionX: number,
  directionY: number,
  attractionStrength: number
): [number, number] => {
  if (distance <= 0) return [0, 0];
  
  const unitX = directionX / distance;
  const unitY = directionY / distance;
  
  const movementMagnitude = distance < MATH_CONSTANTS.MOVEMENT_THRESHOLD 
    ? attractionStrength * distance 
    : Math.min(
        attractionStrength * MATH_CONSTANTS.EXPONENTIAL_DIVISOR, 
        distance * MATH_CONSTANTS.HALF
      );
      
  return [unitX * movementMagnitude, unitY * movementMagnitude];
};

const calculatePercentageMovement = (
  directionX: number,
  directionY: number,
  attractionStrength: number
): [number, number] => {
  const percentageToMove = attractionStrength * MATH_CONSTANTS.PERCENTAGE_MULTIPLIER;
  return [directionX * percentageToMove, directionY * percentageToMove];
};

type MovementParams = {
  distance: number;
  directionX: number;
  directionY: number;
  attractionStrength: number;
  effectiveDistance?: number;
};

const calculateDistanceScaled = (distance: number, attractionStrength: number): number => {
  if (distance < MATH_CONSTANTS.CLOSE_DISTANCE_THRESHOLD) {
    return attractionStrength * distance;
  }
  
  const baseMovement = attractionStrength * MATH_CONSTANTS.BASE_MOVEMENT_MULTIPLIER;
  return baseMovement * (1 - Math.exp(-distance / MATH_CONSTANTS.EXPONENTIAL_DIVISOR));
};

const calculateDistanceScaledPlus = (
  distance: number, 
  attractionStrength: number, 
  effectiveDistance: number
): number => {
  if (distance < MATH_CONSTANTS.CLOSE_DISTANCE_THRESHOLD) {
    return attractionStrength * distance;
  }
  
  const baseMovement = attractionStrength * (effectiveDistance * MATH_CONSTANTS.DISTANCE_SCALE_FACTOR);
  return baseMovement * (1 - Math.exp(-distance / MATH_CONSTANTS.EXPONENTIAL_DIVISOR));
};

const calculateExponentialMovement = (params: MovementParams): [number, number] => {
  const { distance, directionX, directionY, attractionStrength } = params;
  
  if (distance <= 0) return [0, 0];
  
  const unitX = directionX / distance;
  const unitY = directionY / distance;
  const distanceScaled = calculateDistanceScaled(distance, attractionStrength);
  
  return [unitX * distanceScaled, unitY * distanceScaled];
};

const calculateExponentialPlusMovement = (params: MovementParams): [number, number] => {
  const { distance, directionX, directionY, attractionStrength, effectiveDistance = 0 } = params;
  
  if (distance <= 0) return [0, 0];
  
  const unitX = directionX / distance;
  const unitY = directionY / distance;
  const distanceScaled = calculateDistanceScaledPlus(distance, attractionStrength, effectiveDistance);
  
  return [unitX * distanceScaled, unitY * distanceScaled];
};

const calculateTargetPosition = (equation: string, params: MovementParams): [number, number] => {
  const { distance, directionX, directionY, attractionStrength } = params;
  
  switch (equation) {
    case 'original': {
      return calculateOriginalMovement(directionX, directionY, attractionStrength);
    }
    case 'capped': {
      return calculateCappedMovement(distance, directionX, directionY, attractionStrength);
    }
    case 'percentage': {
      return calculatePercentageMovement(directionX, directionY, attractionStrength);
    }
    case 'exponential': {
      return calculateExponentialMovement(params);
    }
    case 'exponential-plus': {
      return calculateExponentialPlusMovement(params);
    }
    default: {
      return calculateOriginalMovement(directionX, directionY, attractionStrength);
    }
  }
};

const applyMagneticMovement = (
  element: HTMLElement,
  targetX: number,
  targetY: number,
  config: Required<MagneticConfig>
): void => {
  gsap.to(element, {
    x: targetX,
    y: targetY,
    duration: config.duration,
    ease: config.ease
  });
};

type DebugInfo = {
  distance: number;
  attractionStrength: number;
  targetX: number;
  targetY: number;
  directionX: number;
  directionY: number;
  effectiveDistance: number;
  config: Required<MagneticConfig>;
};

const logDebugInfo = (debugInfo: DebugInfo): void => {
  const { distance, attractionStrength, targetX, targetY, directionX, directionY, effectiveDistance, config } = debugInfo;
  
  // eslint-disable-next-line no-console
  console.log('Magnetic effect:', {
    distance,
    magneticForce: attractionStrength,
    target: { x: targetX, y: targetY },
    direction: { x: directionX, y: directionY },
    normalizedDistance: distance / effectiveDistance,
    strength: config.strength,
    fullWindow: config.fullWindow
  });
};

type MousePositionParams = {
  mouseX: number;
  mouseY: number;
  element: HTMLElement;
  config: Required<MagneticConfig>;
};

const processMousePosition = (
  params: MousePositionParams,
  resetPosition: () => void
): void => {
  const { mouseX, mouseY, element, config } = params;
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / MATH_CONSTANTS.HALF;
  const centerY = rect.top + rect.height / MATH_CONSTANTS.HALF;
  
  const distance = calculateDistance(mouseX, mouseY, centerX, centerY);
  const effectiveDistance = calculateEffectiveDistance(
    config.fullWindow, 
    config.distance, 
    centerX, 
    centerY
  );

  if (config.fullWindow || distance < config.distance) {
    const directionX = mouseX - centerX;
    const directionY = mouseY - centerY;
    const attractionStrength = calculateMagneticForce(distance, effectiveDistance, config.strength);
    
    const [targetX, targetY] = calculateTargetPosition(config.equation, {
      distance,
      directionX,
      directionY,
      attractionStrength,
      effectiveDistance
    });
    
    applyMagneticMovement(element, targetX, targetY, config);
    
    if (config.debug) {
      logDebugInfo({
        distance,
        attractionStrength,
        targetX,
        targetY,
        directionX,
        directionY,
        effectiveDistance,
        config
      });
    }
  } else {
    resetPosition();
  }
};

const createEventHandlers = (
  element: HTMLElement,
  config: Required<MagneticConfig>
) => {
  let lastMouseX = 0;
  let lastMouseY = 0;

  const resetPosition = (): void => {
    gsap.to(element, {
      x: 0,
      y: 0,
      duration: config.duration,
      ease: config.ease
    });
  };

  const calculateMagneticEffect = (mouseX: number, mouseY: number): void => {
    processMousePosition({ mouseX, mouseY, element, config }, resetPosition);
  };

  const handleMouseMove = (e: MouseEvent): void => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    calculateMagneticEffect(e.clientX, e.clientY);
  };

  const handleScroll = (): void => {
    calculateMagneticEffect(lastMouseX, lastMouseY);
  };

  return { handleMouseMove, handleScroll, resetPosition };
};

export const useMagnetic = <T extends HTMLElement>(
  config: MagneticConfig = {}
): RefObject<T> => {
  const elementRef = useRef<T>(null);
  
  const mergedConfig = useMemo(
    () => ({ ...defaultConfig, ...config }),
    [config]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const { handleMouseMove, handleScroll, resetPosition } = createEventHandlers(element, mergedConfig);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('scroll', handleScroll, { passive: true });
    element.addEventListener('mouseleave', resetPosition);

    return (): void => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      element.removeEventListener('mouseleave', resetPosition);
    };
  }, [mergedConfig]);

  return elementRef;
};
