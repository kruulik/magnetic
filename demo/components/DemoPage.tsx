import React from 'react';

import type { DemoType } from '../constants/demoConfig';
import styles from '../styles/Demo.module.scss';

import { ControlsPanel } from './ControlsPanel';
import { DemoContent } from './DemoContent';
import { DemoInfo } from './DemoInfo';
import { SidebarMorphDemo } from './SidebarMorphDemo';

type Ease =
  | 'power1.out'
  | 'power2.out'
  | 'power3.out'
  | 'back.out'
  | 'elastic.out'
  | 'bounce.out';

type LavaParams = {
  pointinessFactor: number;
  stretchFactor: number;
  pointinessMultiplier: number;
  minDistance: number;
  surfaceBuffer: number;
  smoothingFactor: number;
  dampeningPower: number;
  forceCurveExponent: number;
  minDampeningFactor: number;
  perceivedCursorOffset: number;
};

type RectangleParams = {
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  rectangleWidth: number;
  rectangleHeight: number;
  pointsPerSide: number;
  cornerDeflectionFactor: number;
  stretchiness: number;
  deformationMode: 'cursor' | 'surface-normal';
};

type CoreProps = {
  demoType: DemoType;
  strength: number;
  distance: number;
  duration: number;
  ease: Ease;
  fullWindow: boolean;
  showTooltip: boolean;
};

type ControlActions = {
  setDemoType: (v: DemoType) => void;
  setStrength: (v: number) => void;
  setDistance: (v: number) => void;
  setDuration: (v: number) => void;
  setEase: (v: Ease) => void;
  setFullWindow: (v: boolean) => void;
  setShowTooltip: (v: boolean) => void;
};

type LavaSetters = {
  setPointinessFactor: (v: number) => void;
  setStretchFactor: (v: number) => void;
  setPointinessMultiplier: (v: number) => void;
  setMinDistance: (v: number) => void;
  setSurfaceBuffer: (v: number) => void;
  setSmoothingFactor: (v: number) => void;
  setDampeningPower: (v: number) => void;
  setForceCurveExponent: (v: number) => void;
  setMinDampeningFactor: (v: number) => void;
  setPerceivedCursorOffset: (v: number) => void;
};

type RectangleSetters = {
  setActiveSides: (v: Array<'top' | 'right' | 'bottom' | 'left'>) => void;
  setRectangleWidth: (v: number) => void;
  setRectangleHeight: (v: number) => void;
  setPointsPerSide: (v: number) => void;
  setCornerDeflectionFactor: (v: number) => void;
  setStretchiness: (v: number) => void;
  setDeformationMode: (v: 'cursor' | 'surface-normal') => void;
};

type Props = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  core: CoreProps;
  coreSet: ControlActions;
  lava: LavaParams;
  lavaSet: LavaSetters;
  rectangle: RectangleParams;
  rectangleSet: RectangleSetters;
};

const SidebarSection: React.FC<{
  demoType: DemoType;
  strength: number;
  rectangle: RectangleParams;
}> = ({ demoType, strength, rectangle }) =>
  demoType === 'sidebar-morph' ? (
    <SidebarMorphDemo
      strength={strength}
      stretchiness={rectangle.stretchiness}
      deformationMode={rectangle.deformationMode}
    />
  ) : null;

const ThemeToggleButton: React.FC<{
  isDarkMode: boolean;
  toggle: () => void;
}> = ({ isDarkMode, toggle }) => (
  <button className={styles.themeToggle} onClick={toggle}>
    {isDarkMode ? '☀️ Light' : '🌙 Dark'}
  </button>
);

const ContentSection: React.FC<{
  core: CoreProps;
  lava: LavaParams;
  rectangle: RectangleParams;
}> = ({ core, lava, rectangle }) => (
  <DemoContent
    demoType={core.demoType}
    strength={core.strength}
    distance={core.distance}
    duration={core.duration}
    ease={core.ease}
    fullWindow={core.fullWindow}
    showTooltip={core.showTooltip}
    lava={lava}
    rectangle={rectangle}
  />
);

// Helpers to keep ControlsSection small
const mapLava = (lava: LavaParams, set: LavaSetters) => ({
  pointinessFactor: lava.pointinessFactor,
  setPointinessFactor: set.setPointinessFactor,
  stretchFactor: lava.stretchFactor,
  setStretchFactor: set.setStretchFactor,
  pointinessMultiplier: lava.pointinessMultiplier,
  setPointinessMultiplier: set.setPointinessMultiplier,
  minDistance: lava.minDistance,
  setMinDistance: set.setMinDistance,
  surfaceBuffer: lava.surfaceBuffer,
  setSurfaceBuffer: set.setSurfaceBuffer,
  smoothingFactor: lava.smoothingFactor,
  setSmoothingFactor: set.setSmoothingFactor,
  dampeningPower: lava.dampeningPower,
  setDampeningPower: set.setDampeningPower,
  forceCurveExponent: lava.forceCurveExponent,
  setForceCurveExponent: set.setForceCurveExponent,
  minDampeningFactor: lava.minDampeningFactor,
  setMinDampeningFactor: set.setMinDampeningFactor,
  perceivedCursorOffset: lava.perceivedCursorOffset,
  setPerceivedCursorOffset: set.setPerceivedCursorOffset
});

const mapRectangle = (rect: RectangleParams, set: RectangleSetters) => ({
  activeSides: rect.activeSides,
  setActiveSides: set.setActiveSides,
  rectangleWidth: rect.rectangleWidth,
  setRectangleWidth: set.setRectangleWidth,
  rectangleHeight: rect.rectangleHeight,
  setRectangleHeight: set.setRectangleHeight,
  pointsPerSide: rect.pointsPerSide,
  setPointsPerSide: set.setPointsPerSide,
  cornerDeflectionFactor: rect.cornerDeflectionFactor,
  setCornerDeflectionFactor: set.setCornerDeflectionFactor,
  stretchiness: rect.stretchiness,
  setStretchiness: set.setStretchiness,
  deformationMode: rect.deformationMode,
  setDeformationMode: set.setDeformationMode
});

 
const ControlsSection: React.FC<{
  core: CoreProps;
  coreSet: ControlActions;
  lava: LavaParams;
  lavaSet: LavaSetters;
  rectangle: RectangleParams;
  rectangleSet: RectangleSetters;
}> = ({ core, coreSet, lava, lavaSet, rectangle, rectangleSet }) => {
  const controlsProps = {
    demoType: core.demoType,
    setDemoType: coreSet.setDemoType,
    strength: core.strength,
    setStrength: coreSet.setStrength,
    distance: core.distance,
    setDistance: coreSet.setDistance,
    duration: core.duration,
    setDuration: coreSet.setDuration,
    ease: core.ease,
    setEase: coreSet.setEase,
    fullWindow: core.fullWindow,
    setFullWindow: coreSet.setFullWindow,
    showTooltip: core.showTooltip,
    setShowTooltip: coreSet.setShowTooltip,
    lava: mapLava(lava, lavaSet),
    rectangle: mapRectangle(rectangle, rectangleSet)
  };
  return <ControlsPanel {...controlsProps} />;
};

const InfoSection: React.FC<{ demoType: DemoType }> = ({ demoType }) => (
  <DemoInfo demoType={demoType} />
);

const MainLayout: React.FC<{
  core: CoreProps;
  coreSet: ControlActions;
  lava: LavaParams;
  lavaSet: LavaSetters;
  rectangle: RectangleParams;
  rectangleSet: RectangleSetters;
}> = ({ core, coreSet, lava, lavaSet, rectangle, rectangleSet }) => (
  <div className={styles.container}>
    <ContentSection core={core} lava={lava} rectangle={rectangle} />
    <ControlsSection
      core={core}
      coreSet={coreSet}
      lava={lava}
      lavaSet={lavaSet}
      rectangle={rectangle}
      rectangleSet={rectangleSet}
    />
    <InfoSection demoType={core.demoType} />
  </div>
);

type RootVM = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  core: CoreProps;
  coreSet: ControlActions;
  lava: LavaParams;
  lavaSet: LavaSetters;
  rectangle: RectangleParams;
  rectangleSet: RectangleSetters;
};

const RootSections: React.FC<{ vm: RootVM }> = ({ vm }) => (
  <>
    <SidebarSection demoType={vm.core.demoType} strength={vm.core.strength} rectangle={vm.rectangle} />
    <ThemeToggleButton isDarkMode={vm.isDarkMode} toggle={vm.toggleTheme} />
    <MainLayout
      core={vm.core}
      coreSet={vm.coreSet}
      lava={vm.lava}
      lavaSet={vm.lavaSet}
      rectangle={vm.rectangle}
      rectangleSet={vm.rectangleSet}
    />
  </>
);

export const DemoPage: React.FC<Props> = (props) => <RootSections vm={props} />;
