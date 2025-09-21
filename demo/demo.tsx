import React from 'react';
import { createRoot } from 'react-dom/client';

import { DemoPage } from './components/DemoPage';
import { useCoreParams } from './hooks/useCoreParams';
import { useLavaParams } from './hooks/useLavaParams';
import { useRectangleParams } from './hooks/useRectangleParams';
import { useTheme } from './hooks/useTheme';

import './styles/globals.scss';

const Demo: React.FC<{ debug?: boolean }> = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { core, setCore } = useCoreParams();
  const { lava, setLava } = useLavaParams();
  const { rectangle, setRectangle } = useRectangleParams();

  return (
    <DemoPage
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
      core={core}
      coreSet={setCore}
      lava={lava}
      lavaSet={setLava}
      rectangle={rectangle}
      rectangleSet={setRectangle}
    />
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Demo />);
}
