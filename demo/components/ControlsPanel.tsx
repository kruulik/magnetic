import React from 'react';

import { EASE_OPTIONS, RANGES, type DemoType } from '../constants/demoConfig';
import styles from '../styles/Demo.module.scss';

const HIDDEN_OPACITY = 0.5;

type CommonProps = {
  demoType: DemoType;
  setDemoType: (v: DemoType) => void;

  strength: number;
  setStrength: (v: number) => void;

  distance: number;
  setDistance: (v: number) => void;

  duration: number;
  setDuration: (v: number) => void;

  ease: (typeof EASE_OPTIONS)[number];
  setEase: (v: (typeof EASE_OPTIONS)[number]) => void;

  fullWindow: boolean;
  setFullWindow: (v: boolean) => void;

  showTooltip: boolean;
  setShowTooltip: (v: boolean) => void;
};

type LavaControls = {
  pointinessFactor: number;
  setPointinessFactor: (v: number) => void;
  stretchFactor: number;
  setStretchFactor: (v: number) => void;
  pointinessMultiplier: number;
  setPointinessMultiplier: (v: number) => void;
  minDistance: number;
  setMinDistance: (v: number) => void;
  surfaceBuffer: number;
  setSurfaceBuffer: (v: number) => void;
  smoothingFactor: number;
  setSmoothingFactor: (v: number) => void;
  dampeningPower: number;
  setDampeningPower: (v: number) => void;
  forceCurveExponent: number;
  setForceCurveExponent: (v: number) => void;
  minDampeningFactor: number;
  setMinDampeningFactor: (v: number) => void;
  perceivedCursorOffset: number;
  setPerceivedCursorOffset: (v: number) => void;
};

type RectangleControls = {
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  setActiveSides: (v: Array<'top' | 'right' | 'bottom' | 'left'>) => void;

  rectangleWidth: number;
  setRectangleWidth: (v: number) => void;

  rectangleHeight: number;
  setRectangleHeight: (v: number) => void;

  pointsPerSide: number;
  setPointsPerSide: (v: number) => void;

  cornerDeflectionFactor: number;
  setCornerDeflectionFactor: (v: number) => void;

  stretchiness: number;
  setStretchiness: (v: number) => void;

  deformationMode: 'cursor' | 'surface-normal';
  setDeformationMode: (v: 'cursor' | 'surface-normal') => void;
};

type Props = CommonProps & {
  lava: LavaControls;
  rectangle: RectangleControls;
};

// Generic small UI controls
const RangeControl: React.FC<{
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  suffix?: string;
  dimWhenDisabled?: boolean;
}> = ({ label, min, max, step, value, onChange, disabled, suffix, dimWhenDisabled }) => (
  <div className={styles.controlGroup}>
    <label>{label}</label>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      style={dimWhenDisabled ? { opacity: disabled ? HIDDEN_OPACITY : 1 } : undefined}
    />
    <div
      className={styles.controlValue}
      style={dimWhenDisabled ? { opacity: disabled ? HIDDEN_OPACITY : 1 } : undefined}
    >
      {suffix ? `${value}${suffix}` : value}
    </div>
  </div>
);

const CheckboxControl: React.FC<{
  label: string;
  checked: boolean;
  onChange: (b: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <div className={styles.controlGroup}>
    <label>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  </div>
);

const DemoTypeSelect: React.FC<{ demoType: DemoType; setDemoType: (v: DemoType) => void }> = ({
  demoType,
  setDemoType
}) => (
  <div className={styles.controlGroup}>
    <label>Demo Type</label>
    <select value={demoType} onChange={(e) => setDemoType(e.target.value as DemoType)}>
      <option value="single">Single Sphere + Physics</option>
      <option value="multi">36 Spheres Field</option>
      <option value="lava">Lava Sphere Morphing</option>
      <option value="multi-lava">Multi-Lava Sphere Field</option>
      <option value="magnetic-rectangle">Magnetic Lava Rectangle</option>
      <option value="sidebar-morph">Sidebar Morph Demo</option>
    </select>
  </div>
);

const EasingSelect: React.FC<{
  ease: (typeof EASE_OPTIONS)[number];
  setEase: (v: (typeof EASE_OPTIONS)[number]) => void;
}> = ({ ease, setEase }) => (
  <div className={styles.controlGroup}>
    <label>Animation Easing</label>
    <select value={ease} onChange={(e) => setEase(e.target.value as (typeof EASE_OPTIONS)[number])}>
      {EASE_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

// Core controls split into two small components
const CoreControlsPrimary: React.FC<Pick<
  CommonProps,
  'demoType' | 'setDemoType' | 'strength' | 'setStrength' | 'fullWindow' | 'setFullWindow'
>> = ({ demoType, setDemoType, strength, setStrength, fullWindow, setFullWindow }) => (
  <>
    <h3 className={styles.controlsTitle}>Demo Controls</h3>
    <DemoTypeSelect demoType={demoType} setDemoType={setDemoType} />
    <RangeControl
      label="Attraction Strength"
      min={RANGES.strength.min}
      max={RANGES.strength.max}
      step={RANGES.strength.step}
      value={strength}
      onChange={setStrength}
    />
    <CheckboxControl label="Full Window Range" checked={fullWindow} onChange={setFullWindow} />
  </>
);

const CoreControlsSecondary: React.FC<Pick<
  CommonProps,
  'distance' | 'setDistance' | 'duration' | 'setDuration' | 'showTooltip' | 'setShowTooltip' | 'ease' | 'setEase' | 'fullWindow'
>> = ({ distance, setDistance, duration, setDuration, showTooltip, setShowTooltip, ease, setEase, fullWindow }) => (
  <>
    <RangeControl
      label="Magnetic Field Range"
      min={RANGES.distance.min}
      max={RANGES.distance.max}
      step={RANGES.distance.step}
      value={distance}
      onChange={(n) => setDistance(n)}
      disabled={fullWindow}
      dimWhenDisabled
      suffix="px"
    />
    <RangeControl
      label="Animation Duration"
      min={RANGES.duration.min}
      max={RANGES.duration.max}
      step={RANGES.duration.step}
      value={duration}
      onChange={setDuration}
      suffix="s"
    />
    <CheckboxControl label="Show Debug Tooltip" checked={showTooltip} onChange={setShowTooltip} />
    <EasingSelect ease={ease} setEase={setEase} />
  </>
);

const CoreControls: React.FC<CommonProps> = (props) => (
  <>
    <CoreControlsPrimary
      demoType={props.demoType}
      setDemoType={props.setDemoType}
      strength={props.strength}
      setStrength={props.setStrength}
      fullWindow={props.fullWindow}
      setFullWindow={props.setFullWindow}
    />
    <CoreControlsSecondary
      distance={props.distance}
      setDistance={props.setDistance}
      duration={props.duration}
      setDuration={props.setDuration}
      showTooltip={props.showTooltip}
      setShowTooltip={props.setShowTooltip}
      ease={props.ease}
      setEase={props.setEase}
      fullWindow={props.fullWindow}
    />
  </>
);

// Reusable type for slider descriptors
type SliderDesc = {
  key: string;
  label: string;
  range: { min: number; max: number; step: number };
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
};

const LavaSlidersA = (lava: LavaControls): SliderDesc[] => [
  {
    key: 'pointinessFactor',
    label: 'Pointiness Factor',
    range: RANGES.pointinessFactor,
    value: lava.pointinessFactor,
    onChange: lava.setPointinessFactor
  },
  {
    key: 'stretchFactor',
    label: 'Stretch Factor',
    range: RANGES.stretchFactor,
    value: lava.stretchFactor,
    onChange: lava.setStretchFactor
  },
  {
    key: 'pointinessMultiplier',
    label: 'Pointiness Multiplier',
    range: RANGES.pointinessMultiplier,
    value: lava.pointinessMultiplier,
    onChange: lava.setPointinessMultiplier
  },
  {
    key: 'smoothingFactor',
    label: 'Smoothing Factor',
    range: RANGES.smoothingFactor,
    value: lava.smoothingFactor,
    onChange: lava.setSmoothingFactor
  },
  {
    key: 'surfaceBuffer',
    label: 'Surface Buffer',
    range: RANGES.surfaceBuffer,
    value: lava.surfaceBuffer,
    onChange: (n: number) => lava.setSurfaceBuffer(n),
    suffix: 'px'
  }
];

const LavaSlidersB = (lava: LavaControls): SliderDesc[] => [
  {
    key: 'minDistance',
    label: 'Minimum Distance',
    range: RANGES.minDistance,
    value: lava.minDistance,
    onChange: (n: number) => lava.setMinDistance(n),
    suffix: 'px'
  },
  {
    key: 'dampeningPower',
    label: 'Dampening Power',
    range: RANGES.dampeningPower,
    value: lava.dampeningPower,
    onChange: lava.setDampeningPower
  },
  {
    key: 'forceCurveExponent',
    label: 'Force Curve Exponent',
    range: RANGES.forceCurveExponent,
    value: lava.forceCurveExponent,
    onChange: lava.setForceCurveExponent
  },
  {
    key: 'minDampeningFactor',
    label: 'Min Dampening Factor',
    range: RANGES.minDampeningFactor,
    value: lava.minDampeningFactor,
    onChange: lava.setMinDampeningFactor
  },
  {
    key: 'perceivedCursorOffset',
    label: 'Perceived Cursor Offset',
    range: RANGES.perceivedCursorOffset,
    value: lava.perceivedCursorOffset,
    onChange: (n: number) => lava.setPerceivedCursorOffset(n),
    suffix: 'px'
  }
];

const LavaPhysicsControlsA: React.FC<{ lava: LavaControls }> = ({ lava }) => (
  <>
    {LavaSlidersA(lava).map((it) => (
      <RangeControl
        key={it.key}
        label={it.label}
        min={it.range.min}
        max={it.range.max}
        step={it.range.step}
        value={it.value}
        onChange={it.onChange}
        suffix={it.suffix}
      />
    ))}
  </>
);

const LavaPhysicsControlsB: React.FC<{ lava: LavaControls }> = ({ lava }) => (
  <>
    {LavaSlidersB(lava).map((it) => (
      <RangeControl
        key={it.key}
        label={it.label}
        min={it.range.min}
        max={it.range.max}
        step={it.range.step}
        value={it.value}
        onChange={it.onChange}
        suffix={it.suffix}
      />
    ))}
  </>
);

const LavaPhysicsControls: React.FC<{ lava: LavaControls }> = ({ lava }) => (
  <>
    <h4 className={styles.parametersTitle}>Lava Physics Parameters</h4>
    <LavaPhysicsControlsA lava={lava} />
    <LavaPhysicsControlsB lava={lava} />
  </>
);

const ActiveSidesControl: React.FC<{ rectangle: RectangleControls }> = ({ rectangle }) => (
  <div className={styles.controlGroup}>
    <label>Active Sides</label>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
      {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
        <label key={side} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={rectangle.activeSides.includes(side)}
            onChange={(e) => {
              if (e.target.checked) {
                rectangle.setActiveSides([...rectangle.activeSides, side]);
              } else {
                rectangle.setActiveSides(rectangle.activeSides.filter((s) => s !== side));
              }
            }}
          />
          <span style={{ textTransform: 'capitalize' }}>{side}</span>
        </label>
      ))}
    </div>
  </div>
);

const RectangleConfigControls: React.FC<{ rectangle: RectangleControls }> = ({ rectangle }) => (
  <>
    <h4 className={styles.parametersTitle}>Rectangle Configuration</h4>
    <ActiveSidesControl rectangle={rectangle} />
    <RangeControl
      label="Rectangle Width"
      min={RANGES.rectangleWidth.min}
      max={RANGES.rectangleWidth.max}
      step={RANGES.rectangleWidth.step}
      value={rectangle.rectangleWidth}
      onChange={(n) => rectangle.setRectangleWidth(n)}
      suffix="px"
    />
    <RangeControl
      label="Rectangle Height"
      min={RANGES.rectangleHeight.min}
      max={RANGES.rectangleHeight.max}
      step={RANGES.rectangleHeight.step}
      value={rectangle.rectangleHeight}
      onChange={(n) => rectangle.setRectangleHeight(n)}
      suffix="px"
    />
    <RangeControl
      label="Points Per Side"
      min={RANGES.pointsPerSide.min}
      max={RANGES.pointsPerSide.max}
      step={RANGES.pointsPerSide.step}
      value={rectangle.pointsPerSide}
      onChange={(n) => rectangle.setPointsPerSide(n)}
    />
  </>
);

const DeformationModeSelect: React.FC<{ rectangle: RectangleControls }> = ({ rectangle }) => (
  <div className={styles.controlGroup}>
    <label>Deformation Mode</label>
    <select
      value={rectangle.deformationMode}
      onChange={(e) => rectangle.setDeformationMode(e.target.value as 'cursor' | 'surface-normal')}
    >
      <option value="surface-normal">Surface Normal (Organic Bulges)</option>
      <option value="cursor">Cursor Direction (Angular Waves)</option>
    </select>
  </div>
);

const PerceivedOffsetControl: React.FC<{ rectangle: RectangleControls; lava: LavaControls }> = ({
  rectangle,
  lava
}) =>
  rectangle.deformationMode === 'cursor' ? (
    <RangeControl
      label="Perceived Cursor Offset"
      min={RANGES.perceivedCursorOffset.min}
      max={RANGES.perceivedCursorOffset.max}
      step={RANGES.perceivedCursorOffset.step}
      value={lava.perceivedCursorOffset}
      onChange={(n) => lava.setPerceivedCursorOffset(n)}
      suffix="px"
    />
  ) : null;

const RectanglePhysicsControls: React.FC<{
  rectangle: RectangleControls;
  lava: LavaControls;
}> = ({ rectangle, lava }) => (
  <>
    <h4 className={styles.parametersTitle}>Rectangle Physics Parameters</h4>
    <DeformationModeSelect rectangle={rectangle} />
    <RangeControl
      label="Stretchiness (0=gentle, 1=sharp)"
      min={RANGES.stretchiness.min}
      max={RANGES.stretchiness.max}
      step={RANGES.stretchiness.step}
      value={rectangle.stretchiness}
      onChange={(n) => rectangle.setStretchiness(n)}
    />
    <RangeControl
      label="Corner Deflection Factor"
      min={RANGES.cornerDeflectionFactor.min}
      max={RANGES.cornerDeflectionFactor.max}
      step={RANGES.cornerDeflectionFactor.step}
      value={rectangle.cornerDeflectionFactor}
      onChange={(n) => rectangle.setCornerDeflectionFactor(n)}
    />
    <PerceivedOffsetControl rectangle={rectangle} lava={lava} />
  </>
);

export const ControlsPanel: React.FC<Props> = ({
  demoType,
  setDemoType,
  strength,
  setStrength,
  distance,
  setDistance,
  duration,
  setDuration,
  ease,
  setEase,
  fullWindow,
  setFullWindow,
  showTooltip,
  setShowTooltip,
  lava,
  rectangle
}) => (
  <div className={styles.controls}>
    <CoreControls
      demoType={demoType}
      setDemoType={setDemoType}
      strength={strength}
      setStrength={setStrength}
      distance={distance}
      setDistance={setDistance}
      duration={duration}
      setDuration={setDuration}
      ease={ease}
      setEase={setEase}
      fullWindow={fullWindow}
      setFullWindow={setFullWindow}
      showTooltip={showTooltip}
      setShowTooltip={setShowTooltip}
    />
    {demoType === 'lava' && <LavaPhysicsControls lava={lava} />}
    {demoType === 'magnetic-rectangle' && (
      <>
        <RectangleConfigControls rectangle={rectangle} />
        <RectanglePhysicsControls rectangle={rectangle} lava={lava} />
      </>
    )}
  </div>
);
