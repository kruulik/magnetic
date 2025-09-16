import React, { useRef, useEffect, useState } from 'react';
import { gsap } from 'gsap';
import { MagneticLavaRectangle } from '../../src/components/MagneticLavaRectangle';
import styles from '../styles/SidebarMorphDemo.module.scss';

export const SidebarMorphDemo: React.FC = () => {
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
          strength={isExpanded ? 0 : 8}
          duration={0.3}
          distance={isExpanded ? 0 : 0}
          ease="power2.out"
          fullWindow
          activeSides={isExpanded ? [] : ['right']}
          pointsPerSide={20}
          fill={sidebarColor}
          onCursorInside={isExpanded ? undefined : handleCursorInside}
          attractionMultiplier={isExpanded ? 0 : 1}
          pointinessFactor={0.1}
          minDistance={0}
          surfaceBuffer={0}
          stretchFactor={0.1}
          cornerDeflectionFactor={0.0}
          perceivedCursorOffset={20}
          className={styles.magneticWrapper}
        /></div>

      <div className={styles.instructions}>
        <p>Hover over the left edge to expand • Click anywhere to contract</p>
      </div>
    </div>
  );
};
