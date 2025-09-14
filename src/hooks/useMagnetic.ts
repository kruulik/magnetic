import { useEffect, useRef, RefObject } from 'react';
import { gsap } from 'gsap';
import { MagneticConfig } from '../utils/types';

const defaultConfig: Required<MagneticConfig> = {
  strength: 0.3,
  distance: 100,
  duration: 0.4,
  ease: 'power2.out',
  debug: false
};

export function useMagnetic<T extends HTMLElement>(
  config: MagneticConfig = {}
): RefObject<T> {
  const elementRef = useRef<T>(null);
  const mergedConfig = { ...defaultConfig, ...config };

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const distance = Math.sqrt(
        Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
      );

      if (distance < mergedConfig.distance) {
        // Calculate magnetic attraction - simple and predictable
        const directionX = e.clientX - centerX;
        const directionY = e.clientY - centerY;
        
        // Progressive magnetic force - cubic curve for gradual buildup
        const normalizedDistance = distance / mergedConfig.distance;
        const magneticForce = Math.pow(1 - normalizedDistance, 3); // Cubic curve for gradual buildup
        
        // Calculate target as percentage of way toward cursor FROM original center
        // This keeps the element "tethered" to center but reaching toward cursor
        const attractionStrength = magneticForce * mergedConfig.strength;
        const targetX = directionX * attractionStrength;
        const targetY = directionY * attractionStrength;
        
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
            strength: mergedConfig.strength
          });
        }
      } else {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: mergedConfig.duration,
          ease: mergedConfig.ease
        });
      }
    };

    const handleMouseLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: mergedConfig.duration,
        ease: mergedConfig.ease
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [mergedConfig]);

  return elementRef;
}
