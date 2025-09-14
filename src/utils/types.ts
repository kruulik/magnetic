export interface MagneticConfig {
  strength?: number;   // How strongly the element is attracted to the cursor
  distance?: number;   // The magnetic field range in pixels
  duration?: number;   // Animation duration for return to center
  ease?: string;       // GSAP easing function for animations
  debug?: boolean;     // Enable debug logging
}

export interface MagneticProps {
  children: React.ReactNode;
  config?: MagneticConfig;
  className?: string;
  style?: React.CSSProperties;
}
