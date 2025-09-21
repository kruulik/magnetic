export type DemoType =
  | 'single'
  | 'multi'
  | 'lava'
  | 'multi-lava'
  | 'magnetic-rectangle'
  | 'sidebar-morph';

export const EASE_OPTIONS = [
  'power1.out',
  'power2.out',
  'power3.out',
  'back.out',
  'elastic.out',
  'bounce.out'
] as const;

export const DEFAULTS = {
  demoType: 'magnetic-rectangle' as DemoType,
  strength: 60,
  distance: 100,
  duration: 0.4,
  ease: 'power2.out' as (typeof EASE_OPTIONS)[number],
  fullWindow: true,
  showTooltip: false,
  isDarkMode: false,

  // Lava sphere physics
  pointinessFactor: 0.5,
  stretchFactor: 0.6,
  pointinessMultiplier: 1.2,
  minDistance: 20,
  surfaceBuffer: 60,
  smoothingFactor: 0.4,
  dampeningPower: 0.6,
  forceCurveExponent: 2.5,
  minDampeningFactor: 0.15,
  perceivedCursorOffset: 30,

  // Rectangle-specific
  activeSides: ['right', 'bottom'] as Array<'top' | 'right' | 'bottom' | 'left'>,
  rectangleWidth: 200,
  rectangleHeight: 400,
  pointsPerSide: 12,
  cornerDeflectionFactor: 0.2,
  stretchiness: 0.5,
  deformationMode: 'surface-normal' as 'cursor' | 'surface-normal'
};

export const RANGES = {
  strength: { min: 0, max: 100, step: 1 },
  distance: { min: 50, max: 2000, step: 10 },
  duration: { min: 0.1, max: 1, step: 0.1 },

  // Lava
  pointinessFactor: { min: 0.1, max: 1.0, step: 0.1 },
  stretchFactor: { min: 0.2, max: 1.5, step: 0.1 },
  pointinessMultiplier: { min: 0.5, max: 2.0, step: 0.1 },
  smoothingFactor: { min: 0.1, max: 0.8, step: 0.1 },
  surfaceBuffer: { min: 20, max: 120, step: 10 },
  minDistance: { min: 10, max: 50, step: 5 },
  dampeningPower: { min: 0.3, max: 1.2, step: 0.1 },
  forceCurveExponent: { min: 1.5, max: 4.0, step: 0.1 },
  minDampeningFactor: { min: 0.05, max: 0.3, step: 0.05 },
  perceivedCursorOffset: { min: 0, max: 100, step: 5 },

  // Rectangle
  rectangleWidth: { min: 150, max: 350, step: 25 },
  rectangleHeight: { min: 200, max: 500, step: 25 },
  pointsPerSide: { min: 4, max: 20, step: 2 },
  cornerDeflectionFactor: { min: 0.0, max: 1.0, step: 0.1 },
  stretchiness: { min: 0.0, max: 1.0, step: 0.1 }
} as const;
