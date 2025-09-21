import { useState } from 'react';

import { DEFAULTS } from '../constants/demoConfig';

export const useLavaParams = () => {
  const [pointinessFactor, setPointinessFactor] = useState(DEFAULTS.pointinessFactor);
  const [stretchFactor, setStretchFactor] = useState(DEFAULTS.stretchFactor);
  const [pointinessMultiplier, setPointinessMultiplier] = useState(DEFAULTS.pointinessMultiplier);
  const [minDistance, setMinDistance] = useState(DEFAULTS.minDistance);
  const [surfaceBuffer, setSurfaceBuffer] = useState(DEFAULTS.surfaceBuffer);
  const [smoothingFactor, setSmoothingFactor] = useState(DEFAULTS.smoothingFactor);
  const [dampeningPower, setDampeningPower] = useState(DEFAULTS.dampeningPower);
  const [forceCurveExponent, setForceCurveExponent] = useState(DEFAULTS.forceCurveExponent);
  const [minDampeningFactor, setMinDampeningFactor] = useState(DEFAULTS.minDampeningFactor);
  const [perceivedCursorOffset, setPerceivedCursorOffset] = useState(DEFAULTS.perceivedCursorOffset);

  return {
    lava: {
      pointinessFactor,
      stretchFactor,
      pointinessMultiplier,
      minDistance,
      surfaceBuffer,
      smoothingFactor,
      dampeningPower,
      forceCurveExponent,
      minDampeningFactor,
      perceivedCursorOffset
    },
    setLava: {
      setPointinessFactor,
      setStretchFactor,
      setPointinessMultiplier,
      setMinDistance,
      setSurfaceBuffer,
      setSmoothingFactor,
      setDampeningPower,
      setForceCurveExponent,
      setMinDampeningFactor,
      setPerceivedCursorOffset
    }
  };
};
