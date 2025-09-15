import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { SingleSphereDemo } from './components/SingleSphereDemo';
import { MultiSphereDemo } from './components/MultiSphereDemo';
import { LavaSphereDemo } from './components/LavaSphereDemo';
import { MultiLavaSphereDemo } from './components/MultiLavaSphereDemo';
import './styles/globals.scss';
import styles from './styles/Demo.module.scss';

type DemoType = 'single' | 'multi' | 'lava' | 'multi-lava';

const Demo: React.FC = () => {
  const [demoType, setDemoType] = useState<DemoType>('multi-lava');
  const [strength, setStrength] = useState(2);
  const [distance, setDistance] = useState(100);
  const [duration, setDuration] = useState(0.4);
  const [ease, setEase] = useState('power2.out');
  const [fullWindow, setFullWindow] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Physics parameters for LavaSphereDemo
  const [attractionMultiplier, setAttractionMultiplier] = useState(30);
  const [pointinessFactor, setPointinessFactor] = useState(0.5);
  const [minDistance, setMinDistance] = useState(20);
  const [surfaceBuffer, setSurfaceBuffer] = useState(60);
  const [stretchFactor, setStretchFactor] = useState(0.6);
  const [pointinessMultiplier, setPointinessMultiplier] = useState(1.2);
  const [smoothingFactor, setSmoothingFactor] = useState(0.4);
  const [dampeningPower, setDampeningPower] = useState(0.6);
  const [forceCurveExponent, setForceCurveExponent] = useState(2.5);
  const [minDampeningFactor, setMinDampeningFactor] = useState(0.15);
  const [perceivedCursorOffset, setPerceivedCursorOffset] = useState(30);

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
        ) : demoType === 'multi-lava' ? (
          <MultiLavaSphereDemo
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
            attractionMultiplier={attractionMultiplier}
            pointinessFactor={pointinessFactor}
            minDistance={minDistance}
            surfaceBuffer={surfaceBuffer}
            stretchFactor={stretchFactor}
            pointinessMultiplier={pointinessMultiplier}
            smoothingFactor={smoothingFactor}
            dampeningPower={dampeningPower}
            forceCurveExponent={forceCurveExponent}
            minDampeningFactor={minDampeningFactor}
            perceivedCursorOffset={perceivedCursorOffset}
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
              <option value="multi-lava">Multi-Lava Sphere Field</option>
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
            ) : demoType === 'multi-lava' ? (
              <div>
                <strong>Multi-Lava Sphere Demo:</strong><br />
                36 ferrofluid-like spheres of varying sizes and colors that morph and stretch toward your cursor. Each sphere responds independently with realistic lava-like deformation physics.
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

          {/* Physics Controls for Lava Sphere Demo */}
          {demoType === 'lava' && (
            <>
              <h4 className={styles.parametersTitle}>Lava Physics Parameters</h4>
              
              <div className={styles.controlGroup}>
                <label>Attraction Multiplier</label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="1"
                  value={attractionMultiplier}
                  onChange={(e) => setAttractionMultiplier(parseInt(e.target.value))}
                />
                <div className={styles.controlValue}>{attractionMultiplier}</div>
              </div>

              <div className={styles.controlGroup}>
                <label>Pointiness Factor</label>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={pointinessFactor}
                  onChange={(e) => setPointinessFactor(parseFloat(e.target.value))}
                />
                <div className={styles.controlValue}>{pointinessFactor}</div>
              </div>

              <div className={styles.controlGroup}>
                <label>Stretch Factor</label>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.1"
                  value={stretchFactor}
                  onChange={(e) => setStretchFactor(parseFloat(e.target.value))}
                />
                <div className={styles.controlValue}>{stretchFactor}</div>
              </div>

              <div className={styles.controlGroup}>
                <label>Pointiness Multiplier</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={pointinessMultiplier}
                  onChange={(e) => setPointinessMultiplier(parseFloat(e.target.value))}
                />
                <div className={styles.controlValue}>{pointinessMultiplier}</div>
              </div>

              <div className={styles.controlGroup}>
                <label>Smoothing Factor</label>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.1"
                  value={smoothingFactor}
                  onChange={(e) => setSmoothingFactor(parseFloat(e.target.value))}
                />
                <div className={styles.controlValue}>{smoothingFactor}</div>
              </div>

              <div className={styles.controlGroup}>
                <label>Surface Buffer</label>
                <input
                  type="range"
                  min="20"
                  max="120"
                  step="10"
                  value={surfaceBuffer}
                  onChange={(e) => setSurfaceBuffer(parseInt(e.target.value))}
                />
                <div className={styles.controlValue}>{surfaceBuffer}px</div>
              </div>

              <div className={styles.controlGroup}>
                <label>Minimum Distance</label>
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={minDistance}
                  onChange={(e) => setMinDistance(parseInt(e.target.value))}
                />
                <div className={styles.controlValue}>{minDistance}px</div>
              </div>

              <div className={styles.controlGroup}>
                <label>Dampening Power</label>
                <input
                  type="range"
                  min="0.3"
                  max="1.2"
                  step="0.1"
                  value={dampeningPower}
                  onChange={(e) => setDampeningPower(parseFloat(e.target.value))}
                />
                <div className={styles.controlValue}>{dampeningPower}</div>
              </div>

              <div className={styles.controlGroup}>
                <label>Force Curve Exponent</label>
                <input
                  type="range"
                  min="1.5"
                  max="4.0"
                  step="0.1"
                  value={forceCurveExponent}
                  onChange={(e) => setForceCurveExponent(parseFloat(e.target.value))}
                />
                <div className={styles.controlValue}>{forceCurveExponent}</div>
              </div>

              <div className={styles.controlGroup}>
                <label>Min Dampening Factor</label>
                <input
                  type="range"
                  min="0.05"
                  max="0.3"
                  step="0.05"
                  value={minDampeningFactor}
                  onChange={(e) => setMinDampeningFactor(parseFloat(e.target.value))}
                />
                <div className={styles.controlValue}>{minDampeningFactor}</div>
              </div>

              <div className={styles.controlGroup}>
                <label>Perceived Cursor Offset</label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={perceivedCursorOffset}
                  onChange={(e) => setPerceivedCursorOffset(parseInt(e.target.value))}
                />
                <div className={styles.controlValue}>{perceivedCursorOffset}px</div>
              </div>
            </>
          )}
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
