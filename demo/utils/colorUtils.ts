/**
 * Gets the computed CSS variable value from the document
 */
const getCSSVariable = (variableName: string): string => getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();

// Constants for color generation
const COLOR_CONSTANTS = {
  DEFAULT_BASE_HUE: 30,
  DEFAULT_BASE_SATURATION: 8,
  DEFAULT_BASE_LIGHTNESS_MIN: 10,
  LIGHTNESS_VARIATION_RANGE: 20,
  GOLDEN_ANGLE: 137.5,
  HUE_VARIATION_RANGE: 60,
  FULL_HUE_CIRCLE: 360,
  LIGHTNESS_BASE_OFFSET: 10,
  LIGHTNESS_STEP_SIZE: 4,
  LIGHTNESS_STEP_COUNT: 5,
  SATURATION_BASE_OFFSET: 5,
  SATURATION_STEP_SIZE: 3,
  SATURATION_STEP_COUNT: 3
} as const;

/**
 * Generates a sphere color based on its index using CSS custom properties
 * This creates a variety of colors within the theme's color palette
 */
export const generateSphereColor = (index: number, totalSpheres: number): string => {
  // Get base values from CSS variables
  const baseHue = parseInt(getCSSVariable('--sphere-base-hue'), 10) || COLOR_CONSTANTS.DEFAULT_BASE_HUE;
  const baseSaturation = parseInt(getCSSVariable('--sphere-base-saturation'), 10) || COLOR_CONSTANTS.DEFAULT_BASE_SATURATION;
  const baseLightnessMin = parseInt(getCSSVariable('--sphere-base-lightness-min'), 10) || COLOR_CONSTANTS.DEFAULT_BASE_LIGHTNESS_MIN;
  
  // Create variation in lightness based on the sphere index
  const lightnessVariation = (index / totalSpheres) * COLOR_CONSTANTS.LIGHTNESS_VARIATION_RANGE;
  const hueVariation = (index * COLOR_CONSTANTS.GOLDEN_ANGLE) % COLOR_CONSTANTS.HUE_VARIATION_RANGE;
  
  // Calculate final values
  const finalHue = baseHue + hueVariation;
  const finalSaturation = baseSaturation;
  const finalLightness = baseLightnessMin + lightnessVariation;
  
  return `hsl(${finalHue}, ${finalSaturation}%, ${finalLightness}%)`;
};

/**
 * Alternative approach using a more varied color palette
 */
export const generateVariedSphereColor = (index: number): string => {
  // Get base values from CSS variables
  const baseHue = parseInt(getCSSVariable('--sphere-base-hue'), 10) || COLOR_CONSTANTS.DEFAULT_BASE_HUE;
  const baseSaturation = parseInt(getCSSVariable('--sphere-base-saturation'), 10) || COLOR_CONSTANTS.DEFAULT_BASE_SATURATION;
  const baseLightnessMin = parseInt(getCSSVariable('--sphere-base-lightness-min'), 10) || COLOR_CONSTANTS.DEFAULT_BASE_LIGHTNESS_MIN;
  
  // Create more dramatic variations
  const hueOffset = (index * COLOR_CONSTANTS.GOLDEN_ANGLE) % COLOR_CONSTANTS.FULL_HUE_CIRCLE;
  const lightnessOffset = COLOR_CONSTANTS.LIGHTNESS_BASE_OFFSET + (index % COLOR_CONSTANTS.LIGHTNESS_STEP_COUNT) * COLOR_CONSTANTS.LIGHTNESS_STEP_SIZE;
  const saturationOffset = COLOR_CONSTANTS.SATURATION_BASE_OFFSET + (index % COLOR_CONSTANTS.SATURATION_STEP_COUNT) * COLOR_CONSTANTS.SATURATION_STEP_SIZE;
  
  // Calculate final values
  const finalHue = baseHue + hueOffset;
  const finalSaturation = baseSaturation + saturationOffset;
  const finalLightness = baseLightnessMin + lightnessOffset;
  
  return `hsl(${finalHue}, ${finalSaturation}%, ${finalLightness}%)`;
};
