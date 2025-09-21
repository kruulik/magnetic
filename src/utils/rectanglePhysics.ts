// Physics utilities for MagneticLavaRectangle component
export interface RectPoint {
  x: number;
  y: number;
  side: 'top' | 'right' | 'bottom' | 'left';
  baseX: number;
  baseY: number;
  sidePosition: number;
}

export interface PhysicsConfig {
  width: number;
  height: number;
  stretchiness: number;
  minDistance: number;
  perceivedCursorOffset: number;
}

const MATH_CONSTANTS = {
  HALF: 0.5,
  POWER_OF_TWO: 2,
  SQRT_HALF: 0.707,
  NEGATIVE_SQRT_HALF: -0.707,
  CORNER_BLEND_FACTOR: 0.3,
  STRETCH_SCALE_FACTOR: 0.5,
  FIXED_PADDING: 50,
  FAR_AWAY_DISTANCE: 1000,
  DURATION_MULTIPLIER: 0.3,
  MIN_CLOSE_DAMPENING_FACTOR: 0.05,
  SORT_ORDER_TOP_CORNER: 0,
  SORT_ORDER_TOP: 1,
  SORT_ORDER_RIGHT: 2,
  SORT_ORDER_BOTTOM: 3,
  SORT_ORDER_LEFT: 4,
  SORT_ORDER_DEFAULT: 5,
  SMOOTHSTEP_FACTOR_A: 3,
  SMOOTHSTEP_FACTOR_B: 2,
  DEFAULT_TRANSITION_WIDTH: 20
} as const;

export const VectorUtils = {
  calculateDistance: (x1: number, y1: number, x2: number, y2: number): number => 
    Math.sqrt(Math.pow(x2 - x1, MATH_CONSTANTS.POWER_OF_TWO) + Math.pow(y2 - y1, MATH_CONSTANTS.POWER_OF_TWO)),

  normalizeVector: (x: number, y: number): { x: number; y: number; length: number } => {
    const length = Math.sqrt(x * x + y * y);
    return {
      x: length > 0 ? x / length : 0,
      y: length > 0 ? y / length : 0,
      length
    };
  }
};

export const PhysicsUtils = {
  calculateBaseMagneticForce: (distance: number, effectiveDistance: number): number => {
    const normalizedDistance = distance / effectiveDistance;
    return Math.pow(1 - Math.min(normalizedDistance, 1), MATH_CONSTANTS.POWER_OF_TWO);
  },

  calculateStretch: (magneticForce: number, strength: number, config: PhysicsConfig): number => 
    magneticForce * strength * config.stretchiness * MATH_CONSTANTS.STRETCH_SCALE_FACTOR
};

export const generateCornerPoints = (dimensions: { width: number; height: number }): RectPoint[] => [
  { x: 0, y: 0, baseX: 0, baseY: 0, side: 'top', sidePosition: 0 },
  { x: dimensions.width, y: 0, baseX: dimensions.width, baseY: 0, side: 'top', sidePosition: 1 },
  { x: dimensions.width, y: dimensions.height, baseX: dimensions.width, baseY: dimensions.height, side: 'bottom', sidePosition: 0 },
  { x: 0, y: dimensions.height, baseX: 0, baseY: dimensions.height, side: 'bottom', sidePosition: 1 }
];

export const generateSidePoints = (params: {
  side: 'top' | 'right' | 'bottom' | 'left';
  pointsPerSide: number;
  dimensions: { width: number; height: number };
}): RectPoint[] => {
  const { side, pointsPerSide, dimensions } = params;
  const points: RectPoint[] = [];
  
  for (let i = 1; i < pointsPerSide - 1; i++) {
    const t = i / (pointsPerSide - 1);
    let x: number, y: number;

    switch (side) {
      case 'top':
        x = t * dimensions.width;
        y = 0;
        break;
      case 'right':
        x = dimensions.width;
        y = t * dimensions.height;
        break;
      case 'bottom':
        x = dimensions.width - t * dimensions.width;
        y = dimensions.height;
        break;
      case 'left':
        x = 0;
        y = dimensions.height - t * dimensions.height;
        break;
    }

    points.push({
      x, y,
      baseX: x, baseY: y,
      side,
      sidePosition: t
    });
  }
  
  return points;
};

export const generateRectanglePoints = (params: {
  dimensions: { width: number; height: number };
  activeSides: Array<'top' | 'right' | 'bottom' | 'left'>;
  pointsPerSide: number;
}): RectPoint[] => {
  const { dimensions, activeSides, pointsPerSide } = params;
  const points: RectPoint[] = [];

  const corners = generateCornerPoints(dimensions);
  points.push(...corners);

  activeSides.forEach(side => {
    const sidePoints = generateSidePoints({ side, pointsPerSide, dimensions });
    points.push(...sidePoints);
  });

  return points;
};

export const getSortOrder = (point: RectPoint): number => {
  if (point.side === 'top' && point.sidePosition === 0) return MATH_CONSTANTS.SORT_ORDER_TOP_CORNER;
  if (point.side === 'top') return MATH_CONSTANTS.SORT_ORDER_TOP;
  if (point.side === 'right') return MATH_CONSTANTS.SORT_ORDER_RIGHT;
  if (point.side === 'bottom') return MATH_CONSTANTS.SORT_ORDER_BOTTOM;
  if (point.side === 'left') return MATH_CONSTANTS.SORT_ORDER_LEFT;
  return MATH_CONSTANTS.SORT_ORDER_DEFAULT;
};

export const calculateDistanceToRectangleBoundary = (params: {
  cursorX: number;
  cursorY: number;
  rectX: number;
  rectY: number;
  rectWidth: number;
  rectHeight: number;
}): number => {
  const { cursorX, cursorY, rectX, rectY, rectWidth, rectHeight } = params;
  
  // Convert cursor position to rectangle-relative coordinates
  const relativeX = cursorX - rectX;
  const relativeY = cursorY - rectY;
  
  // Calculate distances to each edge
  const distanceToLeft = relativeX;
  const distanceToRight = rectWidth - relativeX;
  const distanceToTop = relativeY;
  const distanceToBottom = rectHeight - relativeY;
  
  // Check if cursor is inside the rectangle
  const isInside = relativeX >= 0 && relativeX <= rectWidth && relativeY >= 0 && relativeY <= rectHeight;
  
  if (isInside) {
    // Inside: return negative distance (closest edge distance)
    const minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);
    return -minDistance;
  } else {
    // Outside: calculate distance to closest point on rectangle
    const clampedX = Math.max(0, Math.min(rectWidth, relativeX));
    const clampedY = Math.max(0, Math.min(rectHeight, relativeY));
    
    const dx = relativeX - clampedX;
    const dy = relativeY - clampedY;
    
    return Math.sqrt(dx * dx + dy * dy);
  }
};

export const calculateDistanceBasedStrength = (
  distanceToBoundary: number,
  baseStrength: number,
  transitionWidth: number = MATH_CONSTANTS.DEFAULT_TRANSITION_WIDTH
): number => {
  if (distanceToBoundary < 0) {
    // Inside the rectangle - no magnetic effect
    return 0;
  }
  
  // Outside the rectangle - apply smooth transition
  if (distanceToBoundary < transitionWidth) {
    // Smooth transition from 0 to full strength
    const normalizedDistance = distanceToBoundary / transitionWidth;
    const smoothFactor = normalizedDistance * normalizedDistance * (MATH_CONSTANTS.SMOOTHSTEP_FACTOR_A - MATH_CONSTANTS.SMOOTHSTEP_FACTOR_B * normalizedDistance);
    return baseStrength * smoothFactor;
  }
  
  // Far outside - full strength
  return baseStrength;
};
