import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useMagnetic } from '../src/index';

const Demo: React.FC = () => {
  const [strength, setStrength] = useState(0.3);
  const [distance, setDistance] = useState(100);
  const [duration, setDuration] = useState(0.4);
  const [ease, setEase] = useState('power2.out');

  const magneticRef = useMagnetic<HTMLDivElement>({
    strength,
    distance,
    duration,
    ease,
    debug: false
  });

  const easeOptions = [
    'power1.out',
    'power2.out',
    'power3.out',
    'back.out',
    'elastic.out',
    'bounce.out'
  ];

  return (
    <div className="demo-container">
      <div className="sphere-container">
        <div
          ref={magneticRef}
          style={{
            width: '150px',
            height: '150px',
            backgroundColor: '#2f2e2c',
            borderRadius: '50%',
            cursor: 'pointer',
          }}
        />
      </div>
      
      <div className="controls">
        <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: '1.1rem' }}>Magnetic Parameters</h3>
        
        <div className="control-group">
          <label>Attraction Strength</label>
          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>
            Controls how strongly the element is pulled toward the cursor.
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={strength}
            onChange={(e) => setStrength(parseFloat(e.target.value))}
          />
          <div className="control-value">{strength}</div>
        </div>

        <div className="control-group">
          <label>Magnetic Field Range</label>
          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>
            The distance from the element where magnetic attraction begins.
          </div>
          <input
            type="range"
            min="50"
            max="500"
            step="10"
            value={distance}
            onChange={(e) => setDistance(parseInt(e.target.value))}
          />
          <div className="control-value">{distance}px</div>
        </div>

        <div className="control-group">
          <label>Animation Duration</label>
          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>
            How long it takes for the element to return to center when cursor leaves.
          </div>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={duration}
            onChange={(e) => setDuration(parseFloat(e.target.value))}
          />
          <div className="control-value">{duration}s</div>
        </div>

        <div className="control-group">
          <label>Animation Easing</label>
          <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '8px' }}>
            The animation curve used for the return-to-center movement.
          </div>
          <select
            value={ease}
            onChange={(e) => setEase(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #2f2e2c',
              background: '#fefefd',
              color: '#2f2e2c'
            }}
          >
            {easeOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Demo />);
}
