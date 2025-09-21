import { gsap } from 'gsap';
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';

import styles from '../styles/LavaSphereDemo.module.scss';

interface LavaSphereDemoProps {
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  showTooltip: boolean;
  numPoints?: number;
  attractionMultiplier?: number;
  pointinessFactor?: number;
  minDistance?: number;
  surfaceBuffer?: number;
  stretchFactor?: number;
  pointinessMultiplier?: number;
  smoothingFactor?: number;
  dampeningPower?: number;
  forceCurveExponent?: number;
  minDampeningFactor?: number;
  perceivedCursorOffset?: number;
}

interface PhysicsConfig {
  baseRadius: number;
  attractionMultiplier: number;
  pointinessFactor: number;
  minDistance: number;
  surfaceBuffer: number;
  stretchFactor: number;
  pointinessMultiplier: number;
  smoothingFactor: number;
  dampeningPower: number;
  forceCurveExponent: number;
  minDampeningFactor: number;
  perceivedCursorOffset: number;
  svgSize: number;
  screenToSvgRatio: number;
  maxPointiness: number;
  closeDampeningThreshold: number;
  tipActivationThreshold: number;
  maxTipFactor: number;
  pointyReductionAmount: number;
}

const SVG_WIDTH = 600;
const SVG_HEIGHT = 600;
const SCREEN_WIDTH = 400;
const SCREEN_HEIGHT = 400;

const NUM = { TWO: 2, DEG_180: 180 } as const;
const TAU = Math.PI * NUM.TWO;
const RAD_TO_DEG = NUM.DEG_180 / Math.PI;

const DEFAULT_PHYSICS: PhysicsConfig = {
  baseRadius: 150,
  attractionMultiplier: 30,
  pointinessFactor: 0.5,
  minDistance: 20,
  surfaceBuffer: 60,
  stretchFactor: 0.6,
  pointinessMultiplier: 1.2,
  smoothingFactor: 0.4,
  dampeningPower: 0.6,
  forceCurveExponent: 2.5,
  minDampeningFactor: 0.15,
  perceivedCursorOffset: 30,
  svgSize: SVG_WIDTH,
  screenToSvgRatio: SVG_WIDTH / SCREEN_WIDTH,
  maxPointiness: 0.6,
  closeDampeningThreshold: 2,
  tipActivationThreshold: 0.6,
  maxTipFactor: 1,
  pointyReductionAmount: 15
};

const UI_CONSTANTS = {
  cursorIndicatorSize: 4,
  tooltipOffset: { x: 15, y: 10 },
  farAwayDistance: 1000,
  durationMultiplier: 0.3,
  pointinessStrengthFactor: 0.8,
  minCloseDampeningFactor: 0.2
};

const NEIGHBOR_OFFSETS = { first: 1, second: 2 } as const;
const DECIMALS = { distance: 1, force: 3, amount: 2, angle: 0 } as const;
const DEFAULT_NUM_POINTS = 136;

const half = (n: number): number => n / NUM.TWO;

const getSvgGeometry = (svgEl: SVGSVGElement) => {
  const rect = svgEl.getBoundingClientRect();
  const sphereCenterX = rect.left + half(rect.width);
  const sphereCenterY = rect.top + half(rect.height);
  const vb = svgEl.viewBox.baseVal;
  const svgCenterX = half(vb.width);
  const svgCenterY = half(vb.height);
  return { sphereCenterX, sphereCenterY, svgCenterX, svgCenterY };
};

type Centers = ReturnType<typeof getSvgGeometry>;
type Point = { x: number; y: number };

const buildSmoothPath = (points: Point[], smoothing: number): string => {
  if (points.length === 0) return '';
  let path = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + NEIGHBOR_OFFSETS.first) % points.length];
    const prev = points[(i - NEIGHBOR_OFFSETS.first + points.length) % points.length];
    const nextNext = points[(i + NEIGHBOR_OFFSETS.second) % points.length];
    const prevToNext = { x: next.x - prev.x, y: next.y - prev.y };
    const currentToNextNext = { x: nextNext.x - current.x, y: nextNext.y - current.y };
    const cp1x = current.x + prevToNext.x * smoothing;
    const cp1y = current.y + prevToNext.y * smoothing;
    const cp2x = next.x - currentToNextNext.x * smoothing;
    const cp2y = next.y - currentToNextNext.y * smoothing;
    path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${next.x},${next.y}`;
  }
  path += ' Z';
  return path;
};

const animatePath = (el: SVGPathElement, d: string, durationSec: number, ease: string) => {
  gsap.to(el, { attr: { d }, duration: durationSec, ease });
};

const CoordinateUtils = {
  screenToSvg: (screenCoord: number, screenCenter: number, svgCenter: number, ratio: number): number =>
    (screenCoord - screenCenter) * ratio + svgCenter
};

const VectorUtils = {
  calculateDistance: (x1: number, y1: number, x2: number, y2: number): number => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },
  normalizeVector: (x: number, y: number): { x: number; y: number; length: number } => {
    const length = Math.sqrt(x * x + y * y);
    return { x: length > 0 ? x / length : 0, y: length > 0 ? y / length : 0, length };
  },
  calculateAngle: (x: number, y: number): number => Math.atan2(y, x)
};

const PhysicsUtils = {
  calculateBaseMagneticForce: (distance: number, effectiveDistance: number, config: PhysicsConfig): number => {
    const normalizedDistance = distance / effectiveDistance;
    return Math.pow(1 - Math.min(normalizedDistance, 1), config.forceCurveExponent);
  },
  calculateGlobalDampening: (distance: number, config: PhysicsConfig): number => {
    const sphereRadius = config.baseRadius * (SCREEN_WIDTH / config.svgSize);
    if (distance < sphereRadius + config.surfaceBuffer) {
      const distanceFromSurface = Math.max(distance - sphereRadius, 0);
      const dampeningFactor = Math.max(distanceFromSurface / config.surfaceBuffer, config.minDampeningFactor);
      return Math.pow(dampeningFactor, config.dampeningPower);
    }
    return 1.0;
  },
  calculateCloseDampening: (rawDistance: number, config: PhysicsConfig): number => {
    if (rawDistance < config.minDistance * config.closeDampeningThreshold) {
      return Math.max(
        rawDistance / (config.minDistance * config.closeDampeningThreshold),
        UI_CONSTANTS.minCloseDampeningFactor
      );
    }
    return 1.0;
  },
  calculatePointiness: (magneticForce: number, strength: number, rawDistance: number, config: PhysicsConfig): number => {
    if (magneticForce > config.tipActivationThreshold && rawDistance > config.minDistance) {
      const tipFactor = Math.min(
        (magneticForce - config.tipActivationThreshold) / (1 - config.tipActivationThreshold),
        config.maxTipFactor
      );
      const pointiness = Math.min(magneticForce * strength * UI_CONSTANTS.pointinessStrengthFactor, config.maxPointiness);
      return pointiness * tipFactor * config.pointinessFactor;
    }
    return 0;
  }
};

type PerceivedParams = {
  actualMouseX: number;
  actualMouseY: number;
  sphereCenterX: number;
  sphereCenterY: number;
  offset: number;
};

const calcPerceived = ({
  actualMouseX,
  actualMouseY,
  sphereCenterX,
  sphereCenterY,
  offset
}: PerceivedParams) => {
  const directionX = actualMouseX - sphereCenterX;
  const directionY = actualMouseY - sphereCenterY;
  const distance = VectorUtils.calculateDistance(actualMouseX, actualMouseY, sphereCenterX, sphereCenterY);
  if (distance === 0) return { x: sphereCenterX + offset, y: sphereCenterY };
  const normalized = VectorUtils.normalizeVector(directionX, directionY);
  const perceivedDistance = distance + offset;
  return { x: sphereCenterX + normalized.x * perceivedDistance, y: sphereCenterY + normalized.y * perceivedDistance };
};

type GeneratePath = (opts: {
  mouseX: number;
  mouseY: number;
  sphereCenterX: number;
  sphereCenterY: number;
  strength: number;
  effectiveDistance: number;
  svgCenterX: number;
  svgCenterY: number;
  numPoints?: number;
}) => string;

type MetricsInput = {
  perceived: { x: number; y: number };
  centers: Centers;
  strength: number;
  effectiveDistance: number;
  physics: PhysicsConfig;
  numPoints: number;
  genPath: GeneratePath;
};

const computePathAndMetrics = (input: MetricsInput) => {
  const { perceived, centers, strength, effectiveDistance, physics, numPoints, genPath } = input;
  const dx = perceived.x - centers.sphereCenterX;
  const dy = perceived.y - centers.sphereCenterY;
  const angle = VectorUtils.calculateAngle(dx, dy);
  const perceivedDistance = VectorUtils.calculateDistance(perceived.x, perceived.y, centers.sphereCenterX, centers.sphereCenterY);
  const baseMagneticForce = PhysicsUtils.calculateBaseMagneticForce(perceivedDistance, effectiveDistance, physics);
  const globalDampening = PhysicsUtils.calculateGlobalDampening(perceivedDistance, physics);
  const magneticForce = baseMagneticForce * globalDampening;
  const stretchAmount = magneticForce * strength * physics.stretchFactor;
  const pointiness = Math.min(magneticForce * strength * physics.pointinessMultiplier, physics.maxPointiness);
  const path = genPath({
    mouseX: perceived.x,
    mouseY: perceived.y,
    sphereCenterX: centers.sphereCenterX,
    sphereCenterY: centers.sphereCenterY,
    strength,
    effectiveDistance,
    svgCenterX: centers.svgCenterX,
    svgCenterY: centers.svgCenterY,
    numPoints
  });
  return { path, perceivedDistance, angleDeg: angle * RAD_TO_DEG, magneticForce, stretchAmount, pointiness };
};

const computePoints = (p: {
  mouseX: number;
  mouseY: number;
  centers: Centers;
  strength: number;
  effectiveDistance: number;
  numPoints: number;
  physics: PhysicsConfig;
}): Point[] => {
  const { mouseX, mouseY, centers, strength, effectiveDistance, numPoints, physics } = p;
  const points: Point[] = [];
  const cursorSvgX = CoordinateUtils.screenToSvg(mouseX, centers.sphereCenterX, centers.svgCenterX, physics.screenToSvgRatio);
  const cursorSvgY = CoordinateUtils.screenToSvg(mouseY, centers.sphereCenterY, centers.svgCenterY, physics.screenToSvgRatio);
  const centerDistance = VectorUtils.calculateDistance(mouseX, mouseY, centers.sphereCenterX, centers.sphereCenterY);
  const globalDampening = PhysicsUtils.calculateGlobalDampening(centerDistance, physics);
  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * TAU;
    const baseX = centers.svgCenterX + Math.cos(angle) * physics.baseRadius;
    const baseY = centers.svgCenterY + Math.sin(angle) * physics.baseRadius;
    const pointScreenX = centers.sphereCenterX + Math.cos(angle) * physics.baseRadius * (SCREEN_WIDTH / SVG_WIDTH);
    const pointScreenY = centers.sphereCenterY + Math.sin(angle) * physics.baseRadius * (SCREEN_HEIGHT / SVG_HEIGHT);
    const rawPointDistance = VectorUtils.calculateDistance(mouseX, mouseY, pointScreenX, pointScreenY);
    const pointDistanceToMouse = Math.max(rawPointDistance, physics.minDistance);
    const baseMagneticForce = PhysicsUtils.calculateBaseMagneticForce(pointDistanceToMouse, effectiveDistance, physics);
    const pointMagneticForce = baseMagneticForce * globalDampening;
    const directionToCursor = VectorUtils.normalizeVector(cursorSvgX - baseX, cursorSvgY - baseY);
    let attractionStrength = pointMagneticForce * strength * physics.attractionMultiplier;
    attractionStrength *= PhysicsUtils.calculateCloseDampening(rawPointDistance, physics);
    let x = baseX + directionToCursor.x * attractionStrength;
    let y = baseY + directionToCursor.y * attractionStrength;
    const pointinessAmount = PhysicsUtils.calculatePointiness(pointMagneticForce, strength, rawPointDistance, physics);
    if (pointinessAmount > 0) {
      x += directionToCursor.x * pointinessAmount * physics.pointyReductionAmount;
      y += directionToCursor.y * pointinessAmount * physics.pointyReductionAmount;
    }
    points.push({ x, y });
  }
  return points;
};

const getEffectiveDistanceAndActive = (
  fullWindowMode: boolean,
  triggerDistance: number,
  centers: Centers,
  actualDistance: number
) => {
  const effectiveDistance = fullWindowMode
    ? Math.max(
        centers.sphereCenterX,
        window.innerWidth - centers.sphereCenterX,
        centers.sphereCenterY,
        window.innerHeight - centers.sphereCenterY
      )
    : triggerDistance;
  const isActive = fullWindowMode || actualDistance < triggerDistance;
  return { effectiveDistance, isActive };
};

const createPhysicsConfig = (props: LavaSphereDemoProps): PhysicsConfig => {
  const physicsKeys = [
    'attractionMultiplier', 'pointinessFactor', 'minDistance', 'surfaceBuffer',
    'stretchFactor', 'pointinessMultiplier', 'smoothingFactor', 'dampeningPower',
    'forceCurveExponent', 'minDampeningFactor', 'perceivedCursorOffset'
  ] as const;
  
  const overrides: Partial<PhysicsConfig> = {};
  physicsKeys.forEach(key => {
    if (props[key] !== undefined) {
      overrides[key] = props[key];
    }
  });
  
  return { ...DEFAULT_PHYSICS, ...overrides };
};

// Small hooks to keep main hook short
const usePhysicsConfigFromProps = (props: LavaSphereDemoProps) =>
  useMemo<PhysicsConfig>(
    () => createPhysicsConfig(props),
    [props]
  );

const useLavaPathGenerator = (physicsConfig: PhysicsConfig) =>
  useCallback<GeneratePath>(
    ({
      mouseX,
      mouseY,
      sphereCenterX,
      sphereCenterY,
      strength,
      effectiveDistance,
      svgCenterX,
      svgCenterY,
      numPoints = 32
    }) => {
      const centers: Centers = { sphereCenterX, sphereCenterY, svgCenterX, svgCenterY };
      const pts = computePoints({
        mouseX,
        mouseY,
        centers,
        strength,
        effectiveDistance,
        numPoints,
        physics: physicsConfig
      });
      return buildSmoothPath(pts, physicsConfig.smoothingFactor);
    },
    [physicsConfig]
  );

type DebugInfo = {
  distance: number;
  perceivedDistance: number;
  force: number;
  stretchAmount: number;
  pointiness: number;
  angle: number;
  active: boolean;
} | null;

const handleActiveState = (args: {
  perceived: { x: number; y: number };
  centers: Centers;
  strength: number;
  effectiveDistance: number;
  physicsConfig: PhysicsConfig;
  numPoints: number;
  genPath: GeneratePath;
  svgRef: React.RefObject<SVGSVGElement>;
  duration: number;
  ease: string;
  actualDistance: number;
  setDebugInfo: React.Dispatch<React.SetStateAction<DebugInfo>>;
}) => {
  const { perceived, centers, strength, effectiveDistance, physicsConfig, numPoints, genPath, svgRef, duration, ease, actualDistance, setDebugInfo } = args;
  const metrics = computePathAndMetrics({
    perceived,
    centers,
    strength,
    effectiveDistance,
    physics: physicsConfig,
    numPoints,
    genPath
  });
  const el = svgRef.current?.querySelector('path') as SVGPathElement | null;
  if (el) animatePath(el, metrics.path, duration * UI_CONSTANTS.durationMultiplier, ease);
  setDebugInfo({
    distance: actualDistance,
    perceivedDistance: metrics.perceivedDistance,
    force: metrics.magneticForce,
    stretchAmount: metrics.stretchAmount,
    pointiness: metrics.pointiness,
    angle: metrics.angleDeg,
    active: true
  });
};

const handleInactiveState = (args: {
  centers: Centers;
  effectiveDistance: number;
  numPoints: number;
  genPath: GeneratePath;
  svgRef: React.RefObject<SVGSVGElement>;
  duration: number;
  ease: string;
  actualDistance: number;
  setDebugInfo: React.Dispatch<React.SetStateAction<DebugInfo>>;
}) => {
  const { centers, effectiveDistance, numPoints, genPath, svgRef, duration, ease, actualDistance, setDebugInfo } = args;
  const circlePath = genPath({
    mouseX: centers.sphereCenterX + UI_CONSTANTS.farAwayDistance,
    mouseY: centers.sphereCenterY + UI_CONSTANTS.farAwayDistance,
    sphereCenterX: centers.sphereCenterX,
    sphereCenterY: centers.sphereCenterY,
    strength: 0,
    effectiveDistance,
    svgCenterX: centers.svgCenterX,
    svgCenterY: centers.svgCenterY,
    numPoints
  });
  const el = svgRef.current?.querySelector('path') as SVGPathElement | null;
  if (el) animatePath(el, circlePath, duration, ease);
  setDebugInfo({ distance: actualDistance, perceivedDistance: 0, force: 0, stretchAmount: 0, pointiness: 0, angle: 0, active: false });
};

type CalculateEffectArgs = {
  containerRef: React.RefObject<HTMLDivElement>;
  svgRef: React.RefObject<SVGSVGElement>;
  fullWindow: boolean;
  distance: number;
  strength: number;
  numPoints: number;
  duration: number;
  ease: string;
  physicsConfig: PhysicsConfig;
  setPerceivedMousePos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  setDebugInfo: React.Dispatch<React.SetStateAction<DebugInfo>>;
  genPath: GeneratePath;
};

const makeCalculateEffect = (args: CalculateEffectArgs) => (mouseX: number, mouseY: number) => {
  const { containerRef, svgRef, fullWindow, distance, strength, numPoints, duration, ease, physicsConfig, setPerceivedMousePos, setDebugInfo, genPath } = args;
  if (!containerRef.current || !svgRef.current) return;
  
  const centers = getSvgGeometry(svgRef.current);
  const actualDistance = VectorUtils.calculateDistance(mouseX, mouseY, centers.sphereCenterX, centers.sphereCenterY);
  const perceived = calcPerceived({
    actualMouseX: mouseX,
    actualMouseY: mouseY,
    sphereCenterX: centers.sphereCenterX,
    sphereCenterY: centers.sphereCenterY,
    offset: physicsConfig.perceivedCursorOffset
  });
  setPerceivedMousePos(perceived);
  
  const { effectiveDistance, isActive } = getEffectiveDistanceAndActive(fullWindow, distance, centers, actualDistance);
  
  if (isActive) {
    handleActiveState({ perceived, centers, strength, effectiveDistance, physicsConfig, numPoints, genPath, svgRef, duration, ease, actualDistance, setDebugInfo });
  } else {
    handleInactiveState({ centers, effectiveDistance, numPoints, genPath, svgRef, duration, ease, actualDistance, setDebugInfo });
  }
};

const useInitialPath = (
  svgRef: React.RefObject<SVGSVGElement>,
  pathRef: React.RefObject<SVGPathElement>,
  numPoints: number,
  genPath: GeneratePath
) => {
  useEffect(() => {
    if (pathRef.current && svgRef.current) {
      const { svgCenterX, svgCenterY } = getSvgGeometry(svgRef.current);
      const initialPath = genPath({
        mouseX: svgCenterX + UI_CONSTANTS.farAwayDistance,
        mouseY: svgCenterY + UI_CONSTANTS.farAwayDistance,
        sphereCenterX: svgCenterX,
        sphereCenterY: svgCenterY,
        strength: 0,
        effectiveDistance: UI_CONSTANTS.farAwayDistance,
        svgCenterX,
        svgCenterY,
        numPoints
      });
      pathRef.current.setAttribute('d', initialPath);
    }
  }, [svgRef, pathRef, numPoints, genPath]);
};

const useEventListeners = (calculateMagneticEffect: (x: number, y: number) => void, mousePos: { x: number; y: number }) => {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      calculateMagneticEffect(e.clientX, e.clientY);
    };
    const onScroll = () => calculateMagneticEffect(mousePos.x, mousePos.y);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
    };
  }, [calculateMagneticEffect, mousePos.x, mousePos.y]);
};

// Main small hook composing helpers (under 50 lines)
const useLavaSphereInteractions = (props: LavaSphereDemoProps) => {
  const physicsConfig = usePhysicsConfigFromProps(props);
  const genPath = useLavaPathGenerator(physicsConfig);

  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [perceivedMousePos, setPerceivedMousePos] = useState({ x: 0, y: 0 });
  const [debugInfo, setDebugInfo] = useState<DebugInfo>(null);

  const calculateMagneticEffect = useMemo(
    () =>
      makeCalculateEffect({
        containerRef,
        svgRef,
        fullWindow: props.fullWindow,
        distance: props.distance,
        strength: props.strength,
        numPoints: props.numPoints ?? DEFAULT_NUM_POINTS,
        duration: props.duration,
        ease: props.ease,
        physicsConfig,
        setPerceivedMousePos,
        setDebugInfo,
        genPath
      }),
    [containerRef, svgRef, props.fullWindow, props.distance, props.strength, props.numPoints, props.duration, props.ease, physicsConfig, genPath]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      calculateMagneticEffect(e.clientX, e.clientY);
    },
    [calculateMagneticEffect]
  );

  useEventListeners(calculateMagneticEffect, mousePos);
  useInitialPath(svgRef, pathRef, props.numPoints ?? DEFAULT_NUM_POINTS, genPath);

  return { svgRef, pathRef, containerRef, handleMouseMove, mousePos, perceivedMousePos, debugInfo, showTooltip: props.showTooltip };
};

export const LavaSphereDemo: React.FC<LavaSphereDemoProps> = (props) => {
  const { svgRef, pathRef, containerRef, handleMouseMove, mousePos, perceivedMousePos, debugInfo, showTooltip } =
    useLavaSphereInteractions(props);

  return (
    <div className={styles.demoContent} onMouseMove={handleMouseMove}>
      <div className={styles.sphereContainer} ref={containerRef}>
        <svg ref={svgRef} className={styles.lavaSphere} width={SVG_WIDTH} height={SVG_HEIGHT} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}>
          <path ref={pathRef} className={styles.spherePath} stroke="none" />
        </svg>
        {debugInfo?.active && showTooltip && (
          <div
            className={styles.perceivedCursor}
            style={{ left: perceivedMousePos.x - UI_CONSTANTS.cursorIndicatorSize, top: perceivedMousePos.y - UI_CONSTANTS.cursorIndicatorSize }}
          />
        )}
      </div>

      {showTooltip && debugInfo && (
        <div
          className={`${styles.tooltip} ${!debugInfo.active ? styles.inactive : ''}`}
          style={{ left: mousePos.x + UI_CONSTANTS.tooltipOffset.x, top: mousePos.y - UI_CONSTANTS.tooltipOffset.y }}
        >
          <div className={styles.tooltipDistance}>
            Actual Distance: <strong>{debugInfo.distance.toFixed(DECIMALS.distance)}px</strong>
          </div>
          <div className={styles.tooltipDistance}>
            Perceived Distance: <strong>{debugInfo.perceivedDistance.toFixed(DECIMALS.distance)}px</strong>
          </div>
          <div className={styles.tooltipDistance}>Force: <strong>{debugInfo.force.toFixed(DECIMALS.force)}</strong></div>
          <div className={styles.tooltipDistance}>Stretch: <strong>{debugInfo.stretchAmount.toFixed(DECIMALS.amount)}</strong></div>
          <div className={styles.tooltipDistance}>Pointiness: <strong>{debugInfo.pointiness.toFixed(DECIMALS.amount)}</strong></div>
          <div className={styles.tooltipDistance}>Angle: <strong>{debugInfo.angle.toFixed(DECIMALS.angle)}°</strong></div>
          <div className={styles.tooltipStatus}>{debugInfo.active ? '✓ ACTIVE' : '✗ INACTIVE'}</div>
        </div>
      )}
    </div>
  );
};
