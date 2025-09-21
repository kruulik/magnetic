import { useCoreParams } from './useCoreParams';
import { useLavaParams } from './useLavaParams';
import { useRectangleParams } from './useRectangleParams';
import { useTheme } from './useTheme';

export const useDemoState = () => {
  const { core, setCore } = useCoreParams();
  const { lava, setLava } = useLavaParams();
  const { rectangle, setRectangle } = useRectangleParams();
  const { isDarkMode, toggleTheme } = useTheme();

  return {
    core,
    setCore,
    lava,
    setLava,
    rectangle,
    setRectangle,
    isDarkMode,
    toggleTheme
  };
};
