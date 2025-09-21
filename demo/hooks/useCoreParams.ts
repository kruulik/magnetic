import { useState } from 'react';

import { DEFAULTS, EASE_OPTIONS } from '../constants/demoConfig';
import type { DemoType } from '../constants/demoConfig';

export type CoreParams = {
  demoType: DemoType;
  strength: number;
  distance: number;
  duration: number;
  ease: (typeof EASE_OPTIONS)[number];
  fullWindow: boolean;
  showTooltip: boolean;
};

export type CoreActions = {
  setDemoType: (v: DemoType) => void;
  setStrength: (v: number) => void;
  setDistance: (v: number) => void;
  setDuration: (v: number) => void;
  setEase: (v: CoreParams['ease']) => void;
  setFullWindow: (v: boolean) => void;
  setShowTooltip: (v: boolean) => void;
};

export const useCoreParams = () => {
  const [demoType, setDemoType] = useState<DemoType>(DEFAULTS.demoType);
  const [strength, setStrength] = useState<number>(DEFAULTS.strength);
  const [distance, setDistance] = useState<number>(DEFAULTS.distance);
  const [duration, setDuration] = useState<number>(DEFAULTS.duration);
  const [ease, setEase] = useState<CoreParams['ease']>(DEFAULTS.ease);
  const [fullWindow, setFullWindow] = useState<boolean>(DEFAULTS.fullWindow);
  const [showTooltip, setShowTooltip] = useState<boolean>(DEFAULTS.showTooltip);

  const core: CoreParams = {
    demoType,
    strength,
    distance,
    duration,
    ease,
    fullWindow,
    showTooltip
  };

  const setCore: CoreActions = {
    setDemoType,
    setStrength,
    setDistance,
    setDuration,
    setEase,
    setFullWindow,
    setShowTooltip
  };

  return { core, setCore };
};
