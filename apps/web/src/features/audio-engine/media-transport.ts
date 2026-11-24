export type MediaEvent = "play" | "pause" | "ended" | "ratechange" | "error";

export const PLAYBACK_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

export interface IMediaTransport {
  play(): Promise<void>;
  pause(): void;
  seekMs(ms: number): void;
  setRate(rate: number): void;
  setVolume(vol0to1: number): void;
  getCurrentMs(): number;
  getDurationMs(): number;
}

export class HtmlMediaTransportAdapter implements IMediaTransport {
  constructor(private readonly el: HTMLMediaElement) {}

  async play(): Promise<void> {
    await this.el.play();
  }

  pause(): void {
    this.el.pause();
  }

  seekMs(ms: number): void {
    this.el.currentTime = Math.max(0, ms / 1000);
  }

  setRate(rate: number): void {
    this.el.playbackRate = rate;
  }

  setVolume(vol0to1: number): void {
    this.el.volume = Math.min(1, Math.max(0, vol0to1));
  }

  getCurrentMs(): number {
    return Math.round((this.el.currentTime || 0) * 1000);
  }

  getDurationMs(): number {
    const dur = this.el.duration;
    return Number.isFinite(dur) ? Math.round(dur * 1000) : 0;
  }
}
