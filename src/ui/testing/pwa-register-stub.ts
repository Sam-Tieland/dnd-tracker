import { useState } from 'react';

/** Test stand-in for vite-plugin-pwa's virtual module (alias in vite.config.ts). Tests decide whether an update waits. */
let waiting = false;
export const reloads: boolean[] = [];

export function stubUpdateWaiting(value: boolean): void {
  waiting = value;
}

export function useRegisterSW() {
  const needRefresh = useState(waiting);
  const offlineReady = useState(false);
  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: async (reloadPage?: boolean) => {
      reloads.push(reloadPage === true);
    },
  };
}
