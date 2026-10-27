export const REFRESH_WAIT_MS = 300;

export type RefreshScheduler = {
  schedule: () => void;
  cancel: () => void;
};

// The wait starts at the first event and is not pushed back by later ones:
// a burst becomes one refresh, and a steady stream of events still refreshes
// at least every waitMs instead of never.
export function createRefreshScheduler(refresh: () => void, waitMs = REFRESH_WAIT_MS): RefreshScheduler {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule() {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        refresh();
      }, waitMs);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
