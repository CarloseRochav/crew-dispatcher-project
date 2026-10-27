import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRefreshScheduler } from "@/lib/realtime/refresh-scheduler";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createRefreshScheduler", () => {
  it("waits before refreshing", () => {
    const refresh = vi.fn();
    const scheduler = createRefreshScheduler(refresh, 300);

    scheduler.schedule();
    vi.advanceTimersByTime(299);
    expect(refresh).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("turns a burst of events into one refresh", () => {
    const refresh = vi.fn();
    const scheduler = createRefreshScheduler(refresh, 300);

    scheduler.schedule();
    vi.advanceTimersByTime(100);
    scheduler.schedule();
    scheduler.schedule();
    vi.advanceTimersByTime(1000);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not let a steady stream of events hold the refresh back", () => {
    const refresh = vi.fn();
    const scheduler = createRefreshScheduler(refresh, 300);

    // One event every 100ms for 600ms.
    for (let elapsed = 0; elapsed < 600; elapsed += 100) {
      scheduler.schedule();
      vi.advanceTimersByTime(100);
    }

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("refreshes again for events after the last refresh", () => {
    const refresh = vi.fn();
    const scheduler = createRefreshScheduler(refresh, 300);

    scheduler.schedule();
    vi.advanceTimersByTime(300);
    scheduler.schedule();
    vi.advanceTimersByTime(300);

    expect(refresh).toHaveBeenCalledTimes(2);
  });

  it("never refreshes after cancel, as when the dispatcher leaves the board", () => {
    const refresh = vi.fn();
    const scheduler = createRefreshScheduler(refresh, 300);

    scheduler.schedule();
    scheduler.cancel();
    vi.advanceTimersByTime(1000);

    expect(refresh).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});
