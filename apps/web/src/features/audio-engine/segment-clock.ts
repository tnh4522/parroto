export interface TimedCue {
  id: string;
  startMs: number;
  endMs: number;
}

/**
 * Binary-search helper finding the cue enclosing `currentMs`,
 * or the nearest upcoming cue index when between segments.
 */
export function findCueIndexAtMs(
  cues: readonly TimedCue[],
  currentMs: number
): number {
  if (cues.length === 0) return -1;

  let low = 0;
  let high = cues.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const cue = cues[mid];
    if (!cue) break;
    if (currentMs >= cue.startMs && currentMs < cue.endMs) {
      return mid;
    }
    if (currentMs < cue.startMs) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }
  return Math.min(low, cues.length - 1);
}

/**
 * Pure requestAnimationFrame-driven synchronization loop for lesson/story cues.
 */
export class SegmentClock {
  private rafId: number | null = null;
  private readonly getCurrentMs: () => number;
  private readonly onTick: (currentMs: number) => void;

  constructor(getCurrentMs: () => number, onTick: (currentMs: number) => void) {
    this.getCurrentMs = getCurrentMs;
    this.onTick = onTick;
  }

  start(): void {
    if (this.rafId !== null) return;
    const step = () => {
      this.onTick(this.getCurrentMs());
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
