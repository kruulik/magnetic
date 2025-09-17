import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { MagneticLavaRectangle } from '../../src/components/MagneticLavaRectangle';
import styles from '../styles/SidebarMorphDemo.module.scss';

interface SidebarMorphDemoProps {
  strength?: number;
  attractionMultiplier?: number;
  stretchFactor?: number;
  forceCurveExponent?: number;
  dampeningPower?: number;
  surfaceBuffer?: number;
  magneticDistribution?: number;
  closeDampeningThreshold?: number;
  minCloseDampeningFactor?: number;
  deformationMode?: 'cursor' | 'surface-normal';
}

export const SidebarMorphDemo: React.FC<SidebarMorphDemoProps> = ({
  strength = 8,
  attractionMultiplier = 200,
  stretchFactor = 3.0,
  forceCurveExponent = 0.3,
  dampeningPower = 0.1,
  surfaceBuffer = 10000,
  magneticDistribution = 0.5,
  closeDampeningThreshold = 0,
  minCloseDampeningFactor = 1.0,
  deformationMode = 'surface-normal'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [morphTween, setMorphTween] = useState<gsap.core.Tween | null>(null);

  // Detect dark mode
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Handle cursor inside callback - only respond when not expanded
  const handleCursorInside = (isInside: boolean) => {
    if (isInside && !isExpanded) {
      expandToFullScreen();
    }
  };

  // Expand to full screen
  const expandToFullScreen = () => {
    if (isExpanded || !containerRef.current) return;

    setIsExpanded(true);

    // Kill any existing tween
    if (morphTween) {
      morphTween.kill();
    }

    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Animate the container to cover full screen
    const tween = gsap.to(containerRef.current, {
      width: viewportWidth,
      height: viewportHeight,
      duration: 0.8,
      ease: "power2.out",
      onComplete: () => {
        setMorphTween(null);
      }
    });

    setMorphTween(tween);
  };

  // Contract back to sidebar
  const contractToSidebar = () => {
    if (!isExpanded || !containerRef.current) return;

    // Kill any existing tween
    if (morphTween) {
      morphTween.kill();
    }

    // Animate back to sidebar dimensions
    const tween = gsap.to(containerRef.current, {
      width: 50,
      height: '100vh',
      duration: 0.8,
      ease: "power2.out",
      onComplete: () => {
        setIsExpanded(false);
        setMorphTween(null);
      }
    });

    setMorphTween(tween);
  };

  // Handle click when expanded
  const handleClick = () => {
    if (isExpanded) {
      contractToSidebar();
    }
  };

  const sidebarColor = !isDarkMode ? '#ffffff' : '#000000';

  return (
    <div className={styles.sidebarMorphContainer}>
      <div
        ref={containerRef}
        className={`${styles.sidebar} ${isExpanded ? styles.expanded : ''}`}
        onClick={handleClick}
      >
        <MagneticLavaRectangle
          strength={isExpanded ? 0 : strength}
          duration={0.3}
          distance={isExpanded ? 0 : 0}
          ease="power2.out"
          fullWindow
          activeSides={isExpanded ? [] : ['right']}
          pointsPerSide={20}
          fill={sidebarColor}
          onCursorInside={isExpanded ? undefined : handleCursorInside}
          attractionMultiplier={isExpanded ? 0 : attractionMultiplier}
          pointinessFactor={0.1}
          minDistance={0}
          surfaceBuffer={surfaceBuffer}
          stretchFactor={stretchFactor}
          pointinessMultiplier={1.0}
          smoothingFactor={0.4}
          dampeningPower={dampeningPower}
          forceCurveExponent={forceCurveExponent}
          minDampeningFactor={1.0}
          cornerDeflectionFactor={0.0}
          perceivedCursorOffset={0}
          magneticDistribution={magneticDistribution}
          closeDampeningThreshold={closeDampeningThreshold}
          minCloseDampeningFactor={minCloseDampeningFactor}
          deformationMode={deformationMode}
          className={styles.magneticWrapper}
        /></div>

      <div className={styles.instructions}>
        <p>Hover over the left edge to expand • Click anywhere to contract</p>
      </div>
    </div>
  );
};
