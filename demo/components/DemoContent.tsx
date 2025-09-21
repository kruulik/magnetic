import React from 'react';

import type { DemoType } from '../constants/demoConfig';

import { LavaSphereDemo } from './LavaSphereDemo';
import { MagneticLavaRectangleDemo } from './MagneticLavaRectangleDemo';
import { MultiLavaSphereDemo } from './MultiLavaSphereDemo';
import { MultiSphereDemo } from './MultiSphereDemo';
import { SingleSphereDemo } from './SingleSphereDemo';

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

type CommonProps = {
  strength: number;
  distance: number;
  duration: number;
  ease: string;
  fullWindow: boolean;
  showTooltip: boolean;
};

type Props = CommonProps & {
  demoType: DemoType;
  lava: LavaParams;
  rectangle: RectangleParams;
};

const SingleContent: React.FC<CommonProps> = (p) => (
  <SingleSphereDemo
    strength={p.strength}
    distance={p.distance}
    duration={p.duration}
    ease={p.ease}
    fullWindow={p.fullWindow}
    showTooltip={p.showTooltip}
  />
);

const MultiContent: React.FC<CommonProps> = (p) => (
  <MultiSphereDemo
    strength={p.strength}
    distance={p.distance}
    duration={p.duration}
    ease={p.ease}
    fullWindow={p.fullWindow}
    showTooltip={p.showTooltip}
  />
);

const MultiLavaContent: React.FC<CommonProps> = (p) => (
  <MultiLavaSphereDemo
    strength={p.strength}
    distance={p.distance}
    duration={p.duration}
    ease={p.ease}
    fullWindow={p.fullWindow}
    showTooltip={p.showTooltip}
  />
);

const LavaContent: React.FC<CommonProps & { lava: LavaParams }> = ({ lava, ...p }) => (
  <LavaSphereDemo
    strength={p.strength}
    distance={p.distance}
    duration={p.duration}
    ease={p.ease}
    fullWindow={p.fullWindow}
    showTooltip={p.showTooltip}
    pointinessFactor={lava.pointinessFactor}
    minDistance={lava.minDistance}
    surfaceBuffer={lava.surfaceBuffer}
    stretchFactor={lava.stretchFactor}
    pointinessMultiplier={lava.pointinessMultiplier}
    smoothingFactor={lava.smoothingFactor}
    dampeningPower={lava.dampeningPower}
    forceCurveExponent={lava.forceCurveExponent}
    minDampeningFactor={lava.minDampeningFactor}
    perceivedCursorOffset={lava.perceivedCursorOffset}
  />
);

const MagneticRectangleContent: React.FC<
  CommonProps & { lava: LavaParams; rectangle: RectangleParams }
> = ({ lava, rectangle, ...p }) => (
  <MagneticLavaRectangleDemo
    strength={p.strength}
    distance={p.distance}
    duration={p.duration}
    ease={p.ease}
    fullWindow={p.fullWindow}
    showTooltip={p.showTooltip}
    activeSides={rectangle.activeSides}
    width={rectangle.rectangleWidth}
    height={rectangle.rectangleHeight}
    pointsPerSide={rectangle.pointsPerSide}
    stretchiness={rectangle.stretchiness}
    minDistance={lava.minDistance}
    perceivedCursorOffset={lava.perceivedCursorOffset}
    cornerDeflectionFactor={rectangle.cornerDeflectionFactor}
    deformationMode={rectangle.deformationMode}
  />
);

const SidebarPlaceholder: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
      fontSize: '18px',
      color: 'var(--text-color)',
      textAlign: 'center',
      lineHeight: 1.6
    }}
  >
    <div>
      <h2>Sidebar Morph Demo Active</h2>
      <p>
        Look at the left edge of your screen!
        <br />
        Hover over it to see the morphing sidebar expand.
      </p>
    </div>
  </div>
);

 
export const DemoContent: React.FC<Props> = ({
  demoType,
  strength,
  distance,
  duration,
  ease,
  fullWindow,
  showTooltip,
  lava,
  rectangle
}) => {
  const common: CommonProps = { strength, distance, duration, ease, fullWindow, showTooltip };

  switch (demoType) {
    case 'single':
      return <SingleContent {...common} />;
    case 'multi':
      return <MultiContent {...common} />;
    case 'multi-lava':
      return <MultiLavaContent {...common} />;
    case 'magnetic-rectangle':
      return <MagneticRectangleContent {...common} lava={lava} rectangle={rectangle} />;
    case 'lava':
      return <LavaContent {...common} lava={lava} />;
    case 'sidebar-morph':
    default:
      return <SidebarPlaceholder />;
  }
};
