import React from 'react';

import type { DemoType } from '../constants/demoConfig';
import styles from '../styles/Demo.module.scss';

const SingleInfo = () => (
  <div>
    <strong>Single Sphere Demo:</strong>
    <br />
    Interactive physics visualization with one magnetic sphere and detailed force calculations.
  </div>
);

const MultiInfo = () => (
  <div>
    <strong>Multi-Sphere Demo:</strong>
    <br />
    36 spheres of varying sizes distributed across a 3x height scrollable field, each responding
    independently to cursor movement.
  </div>
);

const MultiLavaInfo = () => (
  <div>
    <strong>Multi-Lava Sphere Demo:</strong>
    <br />
    36 ferrofluid-like spheres of varying sizes and colors that morph and stretch toward your cursor.
    Each sphere responds independently with realistic lava-like deformation physics.
  </div>
);

const MagneticRectangleInfo = () => (
  <div>
    <strong>Magnetic Lava Rectangle Demo:</strong>
    <br />
    A rectangular shape with configurable magnetic sides. Only selected sides respond to cursor attraction,
    creating localized bulges while maintaining straight edges on inactive sides.
  </div>
);

const SidebarMorphInfo = () => (
  <div>
    <strong>Sidebar Morph Demo:</strong>
    <br />
    A sidebar on the left edge morphs to fullscreen on hover. Click anywhere to contract back.
  </div>
);

const LavaInfo = () => (
  <div>
    <strong>Lava Sphere Demo:</strong>
    <br />
    A ferrofluid-like sphere that morphs and stretches toward your cursor with controllable pointiness.
  </div>
);

const getInfoForDemo = (demoType: DemoType) => {
  switch (demoType) {
    case 'single':
      return <SingleInfo />;
    case 'multi':
      return <MultiInfo />;
    case 'multi-lava':
      return <MultiLavaInfo />;
    case 'magnetic-rectangle':
      return <MagneticRectangleInfo />;
    case 'sidebar-morph':
      return <SidebarMorphInfo />;
    case 'lava':
    default:
      return <LavaInfo />;
  }
};

type Props = {
  demoType: DemoType;
};

export const DemoInfo: React.FC<Props> = ({ demoType }) => (
  <div className={styles.demoInfo}>{getInfoForDemo(demoType)}</div>
);
