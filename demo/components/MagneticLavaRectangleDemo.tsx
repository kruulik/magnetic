import React, { useCallback, useMemo, useState } from 'react';

import { MagneticLavaRectangle } from '../../src/components/MagneticLavaRectangle';
import styles from '../styles/MagneticLavaRectangleDemo.module.scss';

interface MagneticLavaRectangleDemoProps {
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  showTooltip: boolean;

  // Rectangle-specific props
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  width?: number;
  height?: number;
  pointsPerSide?: number;

  // Callback props
  onCursorInside?: (isInside: boolean) => void;
  baseColor?: string;
  hoverColor?: string;

  // Physics parameters - essential 5 parameters only
  stretchiness?: number;
  minDistance?: number;
  perceivedCursorOffset?: number;
  cornerDeflectionFactor?: number;
  deformationMode?: 'cursor' | 'surface-normal';
}

const UI_CONSTANTS = {
  cursorIndicatorSize: 4,
  tooltipOffset: { x: 15, y: 10 }
} as const;

/* eslint-disable no-magic-numbers */
const RAD_TO_DEG = 180 / Math.PI;
const STRETCH_FACTOR = 0.5;
const DEFAULT_POINTINESS = 0.3;
const DEFAULT_PERCEIVED_OFFSET = 40;
/* eslint-enable no-magic-numbers */

const DECIMALS = {
  distance: 1,
  force: 3,
  amount: 2
} as const;

const DIVISOR_TWO = 2;
const half = (n: number): number => n / DIVISOR_TWO;

const getViewportCenter = () => ({
  cx: half(window.innerWidth),
  cy: half(window.innerHeight)
});

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

const computePerceivedPosition = (x: number, y: number, offset: number): { x: number; y: number } => {
  const { cx, cy } = getViewportCenter();
  const dx = x - cx;
  const dy = y - cy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return { x: x + offset, y };
  }
  const nx = dx / len;
  const ny = dy / len;
  return { x: cx + nx * (len + offset), y: cy + ny * (len + offset) };
};

type DebugInfo = {
  distance: number;
  perceivedDistance: number;
  force: number;
  stretchAmount: number;
  pointiness: number;
  angle: number;
  active: boolean;
};

const RectangleTooltip: React.FC<{
  debugInfo: DebugInfo;
  showTooltip: boolean;
  mousePos: { x: number; y: number };
  isInside: boolean;
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  width: number;
  height: number;
}> = ({ debugInfo, showTooltip, mousePos, isInside, activeSides, width, height }) => {
  if (!showTooltip || !debugInfo) return null;
  return (
    <div
      className={`${styles.tooltip} ${!debugInfo.active ? styles.inactive : ''}`}
      style={{
        left: mousePos.x + UI_CONSTANTS.tooltipOffset.x,
        top: mousePos.y - UI_CONSTANTS.tooltipOffset.y
      }}
    >
      <div className={styles.tooltipDistance}>
        Distance: <strong>{debugInfo.distance.toFixed(DECIMALS.distance)}px</strong>
      </div>
      <div className={styles.tooltipDistance}>
        Perceived: <strong>{debugInfo.perceivedDistance.toFixed(DECIMALS.distance)}px</strong>
      </div>
      <div className={styles.tooltipDistance}>
        Force: <strong>{debugInfo.force.toFixed(DECIMALS.force)}</strong>
      </div>
      <div className={styles.tooltipDistance}>
        Stretch: <strong>{debugInfo.stretchAmount.toFixed(DECIMALS.amount)}</strong>
      </div>
      <div className={styles.tooltipDistance}>
        Inside: <strong>{isInside ? 'YES' : 'NO'}</strong>
      </div>
      <div className={styles.tooltipDistance}>
        Active Sides: <strong>{activeSides.join(', ')}</strong>
      </div>
      <div className={styles.tooltipDistance}>
        Container: <strong>{width}×{height}</strong>
      </div>
      <div className={styles.tooltipDistance}>
        Element: <strong>{width}×{height}</strong>
      </div>
      <div className={styles.tooltipStatus}>
        {debugInfo.active ? '✓ ACTIVE' : '✗ INACTIVE'}
      </div>
    </div>
  );
};

const PerceivedCursorDot: React.FC<{ show: boolean; x: number; y: number }> = ({ show, x, y }) => {
  if (!show) return null;
  return (
    <div
      className={styles.perceivedCursor}
      style={{
        left: x - UI_CONSTANTS.cursorIndicatorSize,
        top: y - UI_CONSTANTS.cursorIndicatorSize
      }}
    />
  );
};

// Split mouse tracking from debug info calculation
const useMouseTracking = () => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [perceivedMousePos, setPerceivedMousePos] = useState({ x: 0, y: 0 });
  return { mousePos, setMousePos, perceivedMousePos, setPerceivedMousePos };
};

const useDebugCalculation = (showTooltip: boolean, fullWindow: boolean, distance: number, strength: number) => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  
  const calculateDebugInfo = useCallback((actualDistance: number, perceived: { x: number; y: number }) => {
    if (!showTooltip) return;
    const { cx, cy } = getViewportCenter();
    const maxRadius = fullWindow ? Math.max(window.innerWidth, window.innerHeight) : distance;
    const force = clamp(1 - actualDistance / maxRadius, 0, 1);
    const angle = Math.atan2(perceived.y - cy, perceived.x - cx) * RAD_TO_DEG;
    const pdx = perceived.x - cx;
    const pdy = perceived.y - cy;
    const perceivedDistanceVal = Math.sqrt(pdx * pdx + pdy * pdy);
    setDebugInfo({
      distance: actualDistance,
      perceivedDistance: perceivedDistanceVal,
      force,
      stretchAmount: strength * STRETCH_FACTOR,
      pointiness: DEFAULT_POINTINESS,
      angle,
      active: fullWindow || actualDistance < distance
    });
  }, [showTooltip, fullWindow, distance, strength]);

  return { debugInfo, calculateDebugInfo };
};

const useCursorInsideTracking = (onCursorInside?: (inside: boolean) => void) => {
  const [isInside, setIsInside] = useState(false);
  
  const handleCursorInside = useCallback((inside: boolean) => {
    setIsInside(inside);
    onCursorInside?.(inside);
  }, [onCursorInside]);

  return { isInside, handleCursorInside };
};

// Main interaction hook now under 50 lines
const useMagneticRectangleInteractions = (opts: {
  showTooltip: boolean;
  fullWindow: boolean;
  distance: number;
  strength: number;
  perceivedCursorOffset?: number;
  onCursorInside?: (inside: boolean) => void;
  baseColor: string;
  hoverColor: string;
}) => {
  const { showTooltip, fullWindow, distance, strength, perceivedCursorOffset, onCursorInside, baseColor, hoverColor } = opts;
  
  const { mousePos, setMousePos, perceivedMousePos, setPerceivedMousePos } = useMouseTracking();
  const { debugInfo, calculateDebugInfo } = useDebugCalculation(showTooltip, fullWindow, distance, strength);
  const { isInside, handleCursorInside } = useCursorInsideTracking(onCursorInside);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const { cx, cy } = getViewportCenter();
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const actualDistance = Math.sqrt(dx * dx + dy * dy);
    setMousePos({ x: e.clientX, y: e.clientY });
    const offset = perceivedCursorOffset ?? DEFAULT_PERCEIVED_OFFSET;
    const perceived = computePerceivedPosition(e.clientX, e.clientY, offset);
    setPerceivedMousePos(perceived);
    calculateDebugInfo(actualDistance, perceived);
  }, [perceivedCursorOffset, setMousePos, setPerceivedMousePos, calculateDebugInfo]);

  const currentColor = useMemo(() => (isInside ? hoverColor : baseColor), [isInside, baseColor, hoverColor]);

  return { mousePos, perceivedMousePos, isInside, debugInfo, handleMouseMove, handleCursorInside, currentColor };
};

const RectangleContainer: React.FC<{
  width: number;
  height: number;
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  pointsPerSide: number;
  currentColor: string;
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  handleCursorInside: (inside: boolean) => void;
  handleMouseMove: (e: MouseEvent) => void;
  stretchiness?: number;
  minDistance?: number;
  perceivedCursorOffset?: number;
  cornerDeflectionFactor?: number;
  deformationMode?: 'cursor' | 'surface-normal';
  perceivedMousePos: { x: number; y: number };
  debugInfo: DebugInfo | null;
  showTooltip: boolean;
}> = ({
  width,
  height,
  activeSides,
  pointsPerSide,
  currentColor,
  strength,
  distance,
  duration,
  ease,
  fullWindow,
  handleCursorInside,
  handleMouseMove,
  stretchiness,
  minDistance,
  perceivedCursorOffset,
  cornerDeflectionFactor,
  deformationMode,
  perceivedMousePos,
  debugInfo,
  showTooltip
}) => (
  <div className={styles.constrainedContainer} style={{ width, height }}>
    <MagneticLavaRectangle
      activeSides={activeSides}
      pointsPerSide={pointsPerSide}
      fill={currentColor}
      strength={strength}
      distance={distance}
      duration={duration}
      ease={ease}
      fullWindow={fullWindow}
      onCursorInside={handleCursorInside}
      onMouseMove={handleMouseMove}
      stretchiness={stretchiness}
      minDistance={minDistance}
      perceivedCursorOffset={perceivedCursorOffset}
      cornerDeflectionFactor={cornerDeflectionFactor}
      deformationMode={deformationMode}
      className={styles.magneticRectangle}
    />
    <PerceivedCursorDot show={Boolean(debugInfo?.active && showTooltip)} x={perceivedMousePos.x} y={perceivedMousePos.y} />
  </div>
);

const createDefaultDebugInfo = (): DebugInfo => ({
  distance: 0,
  perceivedDistance: 0,
  force: 0,
  stretchAmount: 0,
  pointiness: 0,
  angle: 0,
  active: false
});

const DemoLayout: React.FC<{
  interactions: ReturnType<typeof useMagneticRectangleInteractions>;
  props: MagneticLavaRectangleDemoProps;
}> = ({ interactions, props }) => {
  const { mousePos, perceivedMousePos, isInside, debugInfo, handleMouseMove, handleCursorInside, currentColor } = interactions;
  const { strength, distance: distanceProp, duration, ease, fullWindow, showTooltip, activeSides } = props;
  const { width = 300, height = 500, pointsPerSide = 200 } = props;
  const { stretchiness, minDistance, perceivedCursorOffset, cornerDeflectionFactor, deformationMode } = props;

  const containerProps = {
    width, height, activeSides, pointsPerSide, currentColor, strength,
    distance: distanceProp, duration, ease, fullWindow, handleCursorInside, handleMouseMove,
    stretchiness, minDistance, perceivedCursorOffset, cornerDeflectionFactor, deformationMode,
    perceivedMousePos, debugInfo, showTooltip
  };

  const tooltipProps = {
    debugInfo: debugInfo ?? createDefaultDebugInfo(),
    showTooltip, mousePos, isInside, activeSides, width, height
  };

  return (
    <div className={styles.demoContent}>
      <RectangleContainer {...containerProps} />
      <RectangleTooltip {...tooltipProps} />
    </div>
  );
};

export const MagneticLavaRectangleDemo: React.FC<MagneticLavaRectangleDemoProps> = (props) => {
  const interactions = useMagneticRectangleInteractions({
    showTooltip: props.showTooltip,
    fullWindow: props.fullWindow,
    distance: props.distance,
    strength: props.strength,
    perceivedCursorOffset: props.perceivedCursorOffset,
    onCursorInside: props.onCursorInside,
    baseColor: props.baseColor ?? '#3b3ec0ff',
    hoverColor: props.hoverColor ?? '#ef4444'
  });

  return <DemoLayout interactions={interactions} props={props} />;
};
