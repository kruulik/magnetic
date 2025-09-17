import { gsap } from 'gsap';
import React, { useRef, useEffect, useState } from 'react';

import { MagneticLavaRectangle } from '../../src/components/MagneticLavaRectangle';
import styles from '../styles/SidebarMorphDemo.module.scss';

interface SidebarMorphDemoProps {
  strength?: number;
  stretchiness?: number;
  deformationMode?: 'cursor' | 'surface-normal';
}

// Constants for animation and styling
const SIDEBAR_CONSTANTS = {
  DEFAULT_STRENGTH: 240,
  DEFAULT_STRETCHINESS: 0.8,
  ANIMATION_DURATION: 0.8,
  MAGNETIC_DURATION: 0.3,
  SIDEBAR_WIDTH: 50,
  POINTS_PER_SIDE: 20,
  EXPANDED_STRENGTH: 0,
  EXPANDED_DISTANCE: 0,
  MIN_DISTANCE: 0,
  CORNER_DEFLECTION_FACTOR: 0.0,
  PERCEIVED_CURSOR_OFFSET: 0
} as const;

const COLORS = {
  LIGHT_MODE: '#ffffff',
  DARK_MODE: '#000000'
} as const;

const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDarkMode(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isDarkMode;
};

const useExpansionAnimation = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [morphTween, setMorphTween] = useState<gsap.core.Tween | null>(null);

  const killExistingTween = () => {
    if (morphTween) {
      morphTween.kill();
    }
  };

  const expandToFullScreen = (containerRef: React.RefObject<HTMLDivElement>) => {
    if (isExpanded || !containerRef.current) return;

    setIsExpanded(true);
    killExistingTween();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const tween = gsap.to(containerRef.current, {
      width: viewportWidth,
      height: viewportHeight,
      duration: SIDEBAR_CONSTANTS.ANIMATION_DURATION,
      ease: "power2.out",
      onComplete: () => {
        setMorphTween(null);
      }
    });

    setMorphTween(tween);
  };

  const contractToSidebar = (containerRef: React.RefObject<HTMLDivElement>) => {
    if (!isExpanded || !containerRef.current) return;

    killExistingTween();

    const tween = gsap.to(containerRef.current, {
      width: SIDEBAR_CONSTANTS.SIDEBAR_WIDTH,
      height: '100vh',
      duration: SIDEBAR_CONSTANTS.ANIMATION_DURATION,
      ease: "power2.out",
      onComplete: () => {
        setIsExpanded(false);
        setMorphTween(null);
      }
    });

    setMorphTween(tween);
  };

  return {
    isExpanded,
    expandToFullScreen,
    contractToSidebar
  };
};

export const SidebarMorphDemo: React.FC<SidebarMorphDemoProps> = ({
  strength = SIDEBAR_CONSTANTS.DEFAULT_STRENGTH,
  stretchiness = SIDEBAR_CONSTANTS.DEFAULT_STRETCHINESS,
  deformationMode = 'surface-normal'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isDarkMode = useDarkMode();
  const { isExpanded, expandToFullScreen, contractToSidebar } = useExpansionAnimation();

  const handleCursorInside = (isInside: boolean) => {
    if (isInside && !isExpanded) {
      expandToFullScreen(containerRef);
    }
  };

  const handleClick = () => {
    if (isExpanded) {
      contractToSidebar(containerRef);
    }
  };

  const sidebarColor = !isDarkMode ? COLORS.LIGHT_MODE : COLORS.DARK_MODE;

  return (
    <div className={styles.sidebarMorphContainer}>
      <div
        ref={containerRef}
        className={`${styles.sidebar} ${isExpanded ? styles.expanded : ''}`}
        onClick={handleClick}
      >
        <MagneticLavaRectangle
          strength={isExpanded ? SIDEBAR_CONSTANTS.EXPANDED_STRENGTH : strength}
          duration={SIDEBAR_CONSTANTS.MAGNETIC_DURATION}
          distance={isExpanded ? SIDEBAR_CONSTANTS.EXPANDED_DISTANCE : 0}
          ease="power2.out"
          fullWindow
          activeSides={isExpanded ? [] : ['right']}
          pointsPerSide={SIDEBAR_CONSTANTS.POINTS_PER_SIDE}
          fill={sidebarColor}
          onCursorInside={isExpanded ? undefined : handleCursorInside}
          stretchiness={stretchiness}
          minDistance={SIDEBAR_CONSTANTS.MIN_DISTANCE}
          cornerDeflectionFactor={SIDEBAR_CONSTANTS.CORNER_DEFLECTION_FACTOR}
          perceivedCursorOffset={SIDEBAR_CONSTANTS.PERCEIVED_CURSOR_OFFSET}
          deformationMode={deformationMode}
          className={styles.magneticWrapper}
        />
      </div>

      <div className={styles.instructions}>
        <p>Hover over the left edge to expand • Click anywhere to contract</p>
      </div>
    </div>
  );
};
