export interface MagneticConfig {
  strength?: number;
  distance?: number;
  duration?: number;
  ease?: string;
  debug?: boolean;
  fullWindow?: boolean;
  equation?: 'original' | 'capped' | 'percentage' | 'exponential' | 'exponential-plus';
}

export interface MagneticProps {
  children: React.ReactNode;
  config?: MagneticConfig;
  className?: string;
  style?: React.CSSProperties;
}
