"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Volume2 } from "lucide-react";
import type { MediaTransportType } from "@linguacraft/contracts";
import {
  HtmlMediaTransportAdapter,
  PLAYBACK_RATES,
  type IMediaTransport,
} from "@/features/audio-engine/media-transport";
import {
  SegmentClock,
  type TimedCue,
} from "@/features/audio-engine/segment-clock";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/Button";

export interface MediaPlayerSurfaceProps {
  title: string;
  mediaType: MediaTransportType;
  signedMediaUrl?: string | null;
  youtubeVideoId?: string | null;
  activeCue: TimedCue | null;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  autoStop: boolean;
  onAutoStopChange?: (enabled: boolean) => void;
  onReplaySegment?: () => void;
  onTimeUpdateMs?: (currentMs: number) => void;
  onTransportReady?: (transport: IMediaTransport | null) => void;
  replaySignal?: number;
  togglePlaySignal?: number;
}

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function MediaPlayerSurface({
  title,
  mediaType,
  signedMediaUrl,
  youtubeVideoId,
  activeCue,
  playbackRate,
  onPlaybackRateChange,
  autoStop,
  onAutoStopChange,
  onReplaySegment,
  onTimeUpdateMs,
  onTransportReady,
  replaySignal = 0,
  togglePlaySignal = 0,
}: MediaPlayerSurfaceProps) {
  const mediaRef = useRef<HTMLAudioElement & HTMLVideoElement>(null);
  const transportRef = useRef<IMediaTransport | null>(null);
  const clockRef = useRef<SegmentClock | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [volume, setVolume] = useState(1);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const activeCueRef = useRef<TimedCue | null>(activeCue);
  const autoStopRef = useRef(autoStop);
  const onTimeUpdateRef = useRef(onTimeUpdateMs);

  useEffect(() => {
    activeCueRef.current = activeCue;
  }, [activeCue]);

  useEffect(() => {
    autoStopRef.current = autoStop;
  }, [autoStop]);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdateMs;
  }, [onTimeUpdateMs]);

  useEffect(() => {
    const el = mediaRef.current;
    if (!el || mediaType === "YOUTUBE" || !signedMediaUrl) {
      transportRef.current = null;
      onTransportReady?.(null);
      return;
    }

    const adapter = new HtmlMediaTransportAdapter(el);
    transportRef.current = adapter;
    adapter.setRate(playbackRate);
    adapter.setVolume(volume);
    onTransportReady?.(adapter);

    const clock = new SegmentClock(
      () => adapter.getCurrentMs(),
      (ms) => {
        setCurrentMs(ms);
        onTimeUpdateRef.current?.(ms);
        const cue = activeCueRef.current;
        if (autoStopRef.current && cue && ms >= cue.endMs) {
          adapter.pause();
          setIsPlaying(false);
          clock.stop();
        }
      }
    );
    clockRef.current = clock;

    const handlePlay = () => {
      setIsPlaying(true);
      setMediaError(null);
      clock.start();
    };
    const handlePause = () => {
      setIsPlaying(false);
      clock.stop();
    };
    const handleLoadedMetadata = () => {
      setDurationMs(adapter.getDurationMs());
    };
    const handleError = () => {
      setIsPlaying(false);
      clock.stop();
      setMediaError("Unable to load audio/video stream.");
    };

    el.addEventListener("play", handlePlay);
    el.addEventListener("pause", handlePause);
    el.addEventListener("ended", handlePause);
    el.addEventListener("loadedmetadata", handleLoadedMetadata);
    el.addEventListener("error", handleError);

    return () => {
      clock.stop();
      el.removeEventListener("play", handlePlay);
      el.removeEventListener("pause", handlePause);
      el.removeEventListener("ended", handlePause);
      el.removeEventListener("loadedmetadata", handleLoadedMetadata);
      el.removeEventListener("error", handleError);
      transportRef.current = null;
      onTransportReady?.(null);
    };
  }, [mediaType, signedMediaUrl, onTransportReady, playbackRate, volume]);

  useEffect(() => {
    transportRef.current?.setRate(playbackRate);
  }, [playbackRate]);

  useEffect(() => {
    transportRef.current?.setVolume(volume);
  }, [volume]);

  const playSegment = useCallback(async () => {
    const transport = transportRef.current;
    if (transport && activeCue) {
      transport.seekMs(activeCue.startMs);
      setCurrentMs(activeCue.startMs);
      try {
        await transport.play();
      } catch {
        setMediaError("Browser blocked automatic playback. Press Play to listen.");
      }
    }
    onReplaySegment?.();
  }, [activeCue, onReplaySegment]);

  const togglePlay = useCallback(async () => {
    const transport = transportRef.current;
    if (!transport) return;
    if (isPlaying) {
      transport.pause();
      return;
    }
    if (activeCue) {
      const now = transport.getCurrentMs();
      if (now < activeCue.startMs || now >= activeCue.endMs) {
        transport.seekMs(activeCue.startMs);
      }
    }
    try {
      await transport.play();
    } catch {
      setMediaError("Playback requires direct interaction in this browser.");
    }
  }, [activeCue, isPlaying]);

  useEffect(() => {
    if (replaySignal > 0) {
      void playSegment();
    }
  }, [replaySignal, playSegment]);

  useEffect(() => {
    if (togglePlaySignal > 0) {
      void togglePlay();
    }
  }, [togglePlaySignal, togglePlay]);

  const cueStart = activeCue?.startMs ?? 0;
  const cueEnd = activeCue?.endMs ?? durationMs;
  const cueSpan = Math.max(1, cueEnd - cueStart);
  const progressPct = activeCue
    ? Math.min(100, Math.max(0, ((currentMs - cueStart) / cueSpan) * 100))
    : durationMs > 0
      ? Math.min(100, Math.max(0, (currentMs / durationMs) * 100))
      : 0;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {mediaType === "YOUTUBE" && youtubeVideoId ? (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-slate-950">
          <iframe
            title={`${title} video player`}
            src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeVideoId)}?rel=0&start=${Math.floor(cueStart / 1000)}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : null}

      {mediaType === "VIDEO" && signedMediaUrl ? (
        <video
          ref={mediaRef}
          src={signedMediaUrl}
          playsInline
          className="aspect-video w-full rounded-xl bg-slate-950"
          aria-label={`${title} video`}
        />
      ) : null}

      {mediaType === "AUDIO" && signedMediaUrl ? (
        <audio
          ref={mediaRef}
          src={signedMediaUrl}
          preload="metadata"
          aria-label={`${title} audio`}
        />
      ) : null}

      {mediaType !== "YOUTUBE" && !signedMediaUrl ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
          Media stream URL unavailable for this lesson preview.
        </div>
      ) : null}

      {mediaError ? (
        <p role="alert" className="text-xs font-medium text-amber-700 dark:text-amber-400">
          {mediaError}
        </p>
      ) : null}

      {/* Progress Track */}
      {mediaType === "YOUTUBE" ? (
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <span>Use the YouTube player above to play or pause.</span>
          {activeCue ? (
            <span className="font-semibold">
              Cue: {formatMs(activeCue.startMs)} – {formatMs(activeCue.endMs)}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="space-y-1.5">
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="progressbar"
            aria-label="Segment playback progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPct)}
          >
            <div
              className="h-full bg-blue-600 transition-[width] duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {formatMs(currentMs)} / {formatMs(activeCue ? activeCue.endMs : durationMs)}
            </span>
            {activeCue ? (
              <span>
                Segment window: {formatMs(activeCue.startMs)} – {formatMs(activeCue.endMs)}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {mediaType !== "YOUTUBE" ? (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void togglePlay()}
              disabled={!signedMediaUrl}
              aria-label={isPlaying ? "Pause audio" : "Play audio"}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4" aria-hidden="true" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Play
                </>
              )}
            </Button>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void playSegment()}
            aria-label="Replay current segment"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Replay
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {onAutoStopChange ? (
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={autoStop}
                onChange={(e) => onAutoStopChange(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Auto-Stop
            </label>
          ) : null}

          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Speed</span>
            <select
              aria-label="Playback speed"
              value={playbackRate}
              onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
              className={cn(
                "rounded-lg border-2 border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              )}
            >
              {PLAYBACK_RATES.map((rate) => (
                <option key={rate} value={rate}>
                  {rate}x
                </option>
              ))}
            </select>
          </label>

          <label className="hidden items-center gap-1.5 text-xs text-slate-600 sm:inline-flex dark:text-slate-400">
            <Volume2 className="h-4 w-4" aria-hidden="true" />
            <input
              type="range"
              aria-label="Volume"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-16 accent-blue-600"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
