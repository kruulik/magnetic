/**
 * Gets the computed CSS variable value from the document
 */
const getCSSVariable = (variableName: string): string => {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
};

/**
 * Generates a sphere color based on its index using CSS custom properties
 * This creates a variety of colors within the theme's color palette
 */
export const generateSphereColor = (index: number, totalSpheres: number): string => {
  // Get base values from CSS variables
  const baseHue = parseInt(getCSSVariable('--sphere-base-hue')) || 30;
  const baseSaturation = parseInt(getCSSVariable('--sphere-base-saturation')) || 8;
  const baseLightnessMin = parseInt(getCSSVariable('--sphere-base-lightness-min')) || 10;
  
  // Create variation in lightness based on the sphere index
  const lightnessVariation = (index / totalSpheres) * 20; // 0-20% variation
  const hueVariation = (index * 137.5) % 60; // Golden angle distribution for hue variation
  
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
  const baseHue = parseInt(getCSSVariable('--sphere-base-hue')) || 30;
  const baseSaturation = parseInt(getCSSVariable('--sphere-base-saturation')) || 8;
  const baseLightnessMin = parseInt(getCSSVariable('--sphere-base-lightness-min')) || 10;
  
  // Create more dramatic variations
  const hueOffset = (index * 137.5) % 360; // Golden angle for even distribution
  const lightnessOffset = 10 + (index % 5) * 4; // 10-26% variation in steps
  const saturationOffset = 5 + (index % 3) * 3; // 5-11% variation
  
  // Calculate final values
  const finalHue = baseHue + hueOffset;
  const finalSaturation = baseSaturation + saturationOffset;
  const finalLightness = baseLightnessMin + lightnessOffset;
  
  return `hsl(${finalHue}, ${finalSaturation}%, ${finalLightness}%)`;
};
