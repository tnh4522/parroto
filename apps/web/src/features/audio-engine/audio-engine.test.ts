import { describe, expect, it, vi } from "vitest";
import {
  HtmlMediaTransportAdapter,
  PLAYBACK_RATES,
} from "./media-transport";
import { findCueIndexAtMs, SegmentClock } from "./segment-clock";
import { evaluateDictationInput } from "../dictation/lib/dictation-engine";

describe("Audio Engine & Dictation Unit Tests", () => {
  it("findCueIndexAtMs locates exact or nearest cue in O(log n)", () => {
    const cues = [
      { id: "c1", startMs: 1000, endMs: 3000 },
      { id: "c2", startMs: 4000, endMs: 6500 },
      { id: "c3", startMs: 7000, endMs: 9000 },
    ];

    expect(findCueIndexAtMs([], 1000)).toBe(-1);
    expect(findCueIndexAtMs(cues, 200)).toBe(0);
    expect(findCueIndexAtMs(cues, 1500)).toBe(0);
    expect(findCueIndexAtMs(cues, 3500)).toBe(1);
    expect(findCueIndexAtMs(cues, 7000)).toBe(2);
    expect(findCueIndexAtMs(cues, 15000)).toBe(2);
  });

  it("SegmentClock ticks cleanly via rAF and cancels cleanly on stop", () => {
    let scheduledCb: FrameRequestCallback | null = null;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      scheduledCb = cb;
      return 42;
    });
    const cancelSpy = vi.fn();
    vi.stubGlobal("cancelAnimationFrame", cancelSpy);

    const ticks: number[] = [];
    const clock = new SegmentClock(() => 2400, (ms) => ticks.push(ms));
    clock.start();
    expect(scheduledCb).not.toBeNull();
    scheduledCb!(0);
    expect(ticks).toEqual([2400]);

    clock.stop();
    expect(cancelSpy).toHaveBeenCalledWith(42);
    vi.unstubAllGlobals();
  });

  it("HtmlMediaTransportAdapter clamps seekMs, rate, volume, and handles NaN duration", () => {
    const fakeEl = {
      currentTime: 0,
      playbackRate: 1,
      volume: 1,
      duration: Number.NaN,
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
    } as unknown as HTMLMediaElement;

    const adapter = new HtmlMediaTransportAdapter(fakeEl);
    adapter.seekMs(-500);
    expect(fakeEl.currentTime).toBe(0);
    adapter.seekMs(2500);
    expect(fakeEl.currentTime).toBe(2.5);
    adapter.setVolume(1.8);
    expect(fakeEl.volume).toBe(1);
    adapter.setVolume(-0.4);
    expect(fakeEl.volume).toBe(0);
    adapter.setRate(PLAYBACK_RATES[2]);
    expect(fakeEl.playbackRate).toBe(0.75);
    expect(adapter.getDurationMs()).toBe(0);
  });

  it("evaluateDictationInput ignores punctuation differences and applies bounded hint penalty", () => {
    const res = evaluateDictationInput(
      "Hello, world!",
      "hello world",
      new Set<number>(),
      0
    );
    expect(res.accuracyScore).toBe(100);
    expect(res.allMatched).toBe(true);

    const penalized = evaluateDictationInput(
      "Hello world",
      "hello",
      new Set([1]),
      1
    );
    expect(penalized.accuracyScore).toBe(25);
    expect(penalized.mistakesCount).toBe(1);
  });
});
