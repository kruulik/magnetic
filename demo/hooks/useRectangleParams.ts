import { useState } from 'react';

import { DEFAULTS } from '../constants/demoConfig';

export const useRectangleParams = () => {
  const [activeSides, setActiveSides] = useState(DEFAULTS.activeSides);
  const [rectangleWidth, setRectangleWidth] = useState(DEFAULTS.rectangleWidth);
  const [rectangleHeight, setRectangleHeight] = useState(DEFAULTS.rectangleHeight);
  const [pointsPerSide, setPointsPerSide] = useState(DEFAULTS.pointsPerSide);
  const [cornerDeflectionFactor, setCornerDeflectionFactor] = useState(DEFAULTS.cornerDeflectionFactor);
  const [stretchiness, setStretchiness] = useState(DEFAULTS.stretchiness);
  const [deformationMode, setDeformationMode] = useState(DEFAULTS.deformationMode);

  return {
    rectangle: {
      activeSides,
      rectangleWidth,
      rectangleHeight,
      pointsPerSide,
      cornerDeflectionFactor,
      stretchiness,
      deformationMode
    },
    setRectangle: {
      setActiveSides,
      setRectangleWidth,
      setRectangleHeight,
      setPointsPerSide,
      setCornerDeflectionFactor,
      setStretchiness,
      setDeformationMode
    }
  };
};
