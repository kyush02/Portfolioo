import { useEffect } from 'react';
import useFluidCursor from './useFluidCursor';

export default function FluidBackground() {
  useEffect(() => {
    useFluidCursor();
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: -1,
      }}
    >
      <canvas
        id="fluid"
        style={{
          width: '100vw',
          height: '100vh',
        }}
      />
    </div>
  );
}
