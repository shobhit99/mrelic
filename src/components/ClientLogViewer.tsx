'use client';

import dynamic from 'next/dynamic';

// Use dynamic import with no SSR for the LogViewer component
// This is necessary because it uses browser-only APIs
const LogViewer = dynamic(() => import('./LogViewer'), {
  ssr: false,
});

export default function ClientLogViewer() {
  return <LogViewer />;
}
