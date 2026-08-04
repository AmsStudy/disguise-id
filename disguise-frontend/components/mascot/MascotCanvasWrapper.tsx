'use client';

/**
 * MascotCanvasWrapper
 * -------------------
 * Client-only wrapper that lazy-loads MascotCanvas (Three.js WebGL) via
 * next/dynamic with ssr:false, preventing any SSR hydration issues.
 *
 * Falls back to a plain Image during loading so there's no CLS.
 */

import dynamic from 'next/dynamic';
import Image from 'next/image';

// Load Three.js canvas only on client — must be inside a Client Component
const MascotCanvas = dynamic(
  () => import('./MascotCanvas').then((mod) => mod.MascotCanvas),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: 340,
          height: 380,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: 'drop-shadow(0 0 20px rgba(0, 229, 255, 0.3))',
        }}
      >
        <Image
          src="/assets/MASKOT.png"
          alt="DISGUISE-ID Maskot"
          width={240}
          height={280}
          style={{ objectFit: 'contain' }}
          priority
        />
      </div>
    ),
  }
);

export { MascotCanvas };
