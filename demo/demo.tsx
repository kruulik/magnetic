import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SingleSphereDemo } from './components/SingleSphereDemo';
import { MultiSphereDemo } from './components/MultiSphereDemo';
import { LavaSphereDemo } from './components/LavaSphereDemo';
import './styles/globals.scss';
import styles from './styles/Demo.module.scss';

type DemoType = 'single' | 'multi' | 'lava' | 'morph';

const Demo: React.FC = () => {
  const [demoType, setDemoType] = useState<DemoType>('lava');
  const [strength, setStrength] = useState(2);
  const [distance, setDistance] = useState(100);
  const [duration, setDuration] = useState(0.4);
  const [ease, setEase] = useState('power2.out');
  const [fullWindow, setFullWindow] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    setIsDarkMode(shouldUseDark);
    document.documentElement.setAttribute('data-theme', shouldUseDark ? 'dark' : 'light');
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    const themeValue = newTheme ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', themeValue);
    localStorage.setItem('theme', themeValue);
  };

  const easeOptions = [
    'power1.out',
    'power2.out',
    'power3.out',
    'back.out',
    'elastic.out',
    'bounce.out'
  ];

  return (
    <>
      <h1 className={styles.title}>Magnetic Components Demo</h1>
      <button className={styles.themeToggle} onClick={toggleTheme}>
        {isDarkMode ? '☀️ Light' : '🌙 Dark'}
      </button>
      
      <div className={styles.container}>
        {demoType === 'single' ? (
          <SingleSphereDemo
            strength={strength}
            distance={distance}
            duration={duration}
            ease={ease}
            fullWindow={fullWindow}
            showTooltip={showTooltip}
          />
        ) : demoType === 'multi' ? (
          <MultiSphereDemo
            strength={strength}
            distance={distance}
            duration={duration}
            ease={ease}
            fullWindow={fullWindow}
            showTooltip={showTooltip}
          />
        ) : (
          <LavaSphereDemo
            strength={strength}
            distance={distance}
            duration={duration}
            ease={ease}
            fullWindow={fullWindow}
            showTooltip={showTooltip}
          />
        )}

        <div className={styles.controls}>
          <h3 className={styles.controlsTitle}>Demo Controls</h3>

          <div className={styles.controlGroup}>
            <label>Demo Type</label>
            <select
              value={demoType}
              onChange={(e) => setDemoType(e.target.value as DemoType)}
            >
              <option value="single">Single Sphere + Physics</option>
              <option value="multi">36 Spheres Field</option>
              <option value="lava">Lava Sphere Morphing</option>
              <option value="morph">GSAP MorphSVG Demo</option>
            </select>
          </div>

          <div className={styles.demoInfo}>
            {demoType === 'single' ? (
              <div>
                <strong>Single Sphere Demo:</strong><br />
                Interactive physics visualization with one magnetic sphere and detailed force calculations.
              </div>
            ) : demoType === 'multi' ? (
              <div>
                <strong>Multi-Sphere Demo:</strong><br />
                36 spheres of varying sizes distributed across a 3x height scrollable field, each responding independently to cursor movement.
              </div>
            ) : demoType === 'morph' ? (
              <div>
                <strong>GSAP MorphSVG Demo:</strong><br />
                A ferrofluid-like sphere using GSAP MorphSVG to transition between predefined shapes, eliminating pinching through shape morphing rather than individual point calculations.
              </div>
            ) : (
              <div>
                <strong>Lava Sphere Demo:</strong><br />
                A ferrofluid-like sphere that morphs and stretches toward your cursor, creating organic liquid-like deformations with controllable pointiness.
              </div>
            )}
          </div>

          <h4 className={styles.parametersTitle}>Magnetic Parameters</h4>

          <div className={styles.controlGroup}>
            <label>Attraction Strength</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={strength}
              onChange={(e) => setStrength(parseFloat(e.target.value))}
            />
            <div className={styles.controlValue}>{strength}</div>
          </div>

          <div className={styles.controlGroup}>
            <label>
              <input
                type="checkbox"
                checked={fullWindow}
                onChange={(e) => setFullWindow(e.target.checked)}
              />
              Full Window Range
            </label>
          </div>

          <div className={styles.controlGroup}>
            <label>Magnetic Field Range</label>
            <input
              type="range"
              min="50"
              max="2000"
              step="10"
              value={distance}
              disabled={fullWindow}
              onChange={(e) => setDistance(parseInt(e.target.value))}
              style={{ opacity: fullWindow ? 0.5 : 1 }}
            />
            <div className={styles.controlValue} style={{ opacity: fullWindow ? 0.5 : 1 }}>
              {fullWindow ? 'Full Window' : `${distance}px`}
            </div>
          </div>

          <div className={styles.controlGroup}>
            <label>Animation Duration</label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value))}
            />
            <div className={styles.controlValue}>{duration}s</div>
          </div>

          <div className={styles.controlGroup}>
            <label>
              <input
                type="checkbox"
                checked={showTooltip}
                onChange={(e) => setShowTooltip(e.target.checked)}
              />
              Show Debug Tooltip
            </label>
          </div>

          <div className={styles.controlGroup}>
            <label>Animation Easing</label>
            <select
              value={ease}
              onChange={(e) => setEase(e.target.value)}
            >
              {easeOptions.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Demo />);
}
