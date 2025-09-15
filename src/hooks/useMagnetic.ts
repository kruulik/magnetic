import { useEffect, useRef, RefObject } from 'react';
import { gsap } from 'gsap';
import { MagneticConfig } from '../utils/types';

const defaultConfig: Required<MagneticConfig> = {
  strength: 0.3,
  distance: 100,
  duration: 0.4,
  ease: 'power2.out',
  debug: false,
  fullWindow: false,
  equation: 'exponential-plus'
};

export function useMagnetic<T extends HTMLElement>(
  config: MagneticConfig = {}
): RefObject<T> {
  const elementRef = useRef<T>(null);
  const mergedConfig = { ...defaultConfig, ...config };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Track last known mouse position for scroll events
    let lastMouseX = 0;
    let lastMouseY = 0;

    const resetPosition = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: mergedConfig.duration,
        ease: mergedConfig.ease
      });
    };

    const calculateMagneticEffect = (mouseX: number, mouseY: number) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distance = Math.sqrt(
        Math.pow(mouseX - centerX, 2) + Math.pow(mouseY - centerY, 2)
      );

      // In full window mode, use actual distance from element to furthest window edge
      const effectiveDistance = mergedConfig.fullWindow 
        ? Math.max(centerX, window.innerWidth - centerX, centerY, window.innerHeight - centerY)
        : mergedConfig.distance;

      if (mergedConfig.fullWindow || distance < mergedConfig.distance) {
        const directionX = mouseX - centerX;
        const directionY = mouseY - centerY;
        const normalizedDistance = distance / effectiveDistance;
        const magneticForce = Math.pow(1 - Math.min(normalizedDistance, 1), 3);
        const attractionStrength = magneticForce * mergedConfig.strength;
        
        // Different equation options for movement calculation
        let targetX: number, targetY: number;
        
        switch (mergedConfig.equation) {
          case 'original':
            targetX = directionX * attractionStrength;
            targetY = directionY * attractionStrength;
            break;
            
          case 'capped':
            if (distance > 0) {
              const unitX = directionX / distance;
              const unitY = directionY / distance;
              // Allow full movement for very close distances, cap for larger distances
              const movementMagnitude = distance < 5 
                ? attractionStrength * distance 
                : Math.min(attractionStrength * 100, distance * 0.5);
              targetX = unitX * movementMagnitude;
              targetY = unitY * movementMagnitude;
            } else {
              targetX = 0;
              targetY = 0;
            }
            break;
            
          case 'percentage':
            // Use higher percentage that allows touching
            const percentageToMove = attractionStrength * 0.8;
            targetX = directionX * percentageToMove;
            targetY = directionY * percentageToMove;
            break;
            
          case 'exponential':
            if (distance > 0) {
              const unitX = directionX / distance;
              const unitY = directionY / distance;
              // Allow full movement for very close distances
              let distanceScaled;
              if (distance < 3) {
                distanceScaled = attractionStrength * distance;
              } else {
                const baseMovement = attractionStrength * 40;
                distanceScaled = baseMovement * (1 - Math.exp(-distance / 100));
              }
              targetX = unitX * distanceScaled;
              targetY = unitY * distanceScaled;
            } else {
              targetX = 0;
              targetY = 0;
            }
            break;
            
          case 'exponential-plus':
            if (distance > 0) {
              const unitX = directionX / distance;
              const unitY = directionY / distance;
              // Allow full movement for very close distances
              let distanceScaled;
              if (distance < 3) {
                distanceScaled = attractionStrength * distance;
              } else {
                // Distance-based scaling instead of magic number
                const baseMovement = attractionStrength * (effectiveDistance * 0.2);
                distanceScaled = baseMovement * (1 - Math.exp(-distance / 100));
              }
              targetX = unitX * distanceScaled;
              targetY = unitY * distanceScaled;
            } else {
              targetX = 0;
              targetY = 0;
            }
            break;
            
          default:
            targetX = directionX * attractionStrength;
            targetY = directionY * attractionStrength;
        }
        
        gsap.to(element, {
          x: targetX,
          y: targetY,
          duration: mergedConfig.duration,
          ease: mergedConfig.ease
        });
        
        if (mergedConfig.debug) {
          console.log('Magnetic effect:', {
            distance,
            magneticForce,
            target: { x: targetX, y: targetY },
            direction: { x: directionX, y: directionY },
            normalizedDistance,
            strength: mergedConfig.strength,
            fullWindow: mergedConfig.fullWindow
          });
        }
      } else {
        resetPosition();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      calculateMagneticEffect(e.clientX, e.clientY);
    };

    const handleScroll = () => {
      // Use last known mouse position to recalculate magnetic effect after scroll
      calculateMagneticEffect(lastMouseX, lastMouseY);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('scroll', handleScroll, { passive: true });
    element.addEventListener('mouseleave', resetPosition);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      element.removeEventListener('mouseleave', resetPosition);
    };
  }, [mergedConfig]);

  return elementRef;
}
