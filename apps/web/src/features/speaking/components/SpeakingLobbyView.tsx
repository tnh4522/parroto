"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import {
  Lock,
  Mic,
  MicOff,
  PhoneOff,
  Plus,
  RefreshCw,
  ShieldAlert,
  Users,
  X,
} from "lucide-react";
import {
  cefrLevelSchema,
  createSpeakingRoomRequestSchema,
  type CefrLevel,
  type SpeakingRoom,
} from "@linguacraft/contracts";
import {
  useCreateSpeakingRoomMutation,
  useSpeakingRoomsQuery,
} from "@/features/speaking/api/speaking-api";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/shared/stores/auth-store";
import { useGlobalUiStore } from "@/shared/stores/ui-store";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardContent, CardHeader } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/shared/ui/StateBoundary";

const TOPIC_PRESETS = [
  "Daily Life",
  "IELTS Speaking",
  "Travel",
  "Tech",
  "Career",
] as const;

export function SpeakingLobbyView() {
  const user = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const openLoginModal = useGlobalUiStore((s) => s.openLoginModal);

  const [cefrFilter, setCefrFilter] = useState<CefrLevel | "">("");
  const [topicFilter, setTopicFilter] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [roomName, setRoomName] = useState("");
  const [roomTopic, setRoomTopic] = useState("Daily Life");
  const [roomLevel, setRoomLevel] = useState<CefrLevel>("B1");
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [isPrivate, setIsPrivate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinedRoom, setJoinedRoom] = useState<SpeakingRoom | null>(null);
  const [isMuted, setIsMuted] = useState(false);

  const roomsQuery = useSpeakingRoomsQuery({
    cefrLevel: cefrFilter,
    topic: topicFilter || undefined,
  });

  const createRoomMutation = useCreateSpeakingRoomMutation();

  const canEnterVoiceRooms =
    authStatus === "authenticated" && Boolean(user?.ageVerified);

  const handleOpenCreate = () => {
    if (authStatus === "guest") {
      openLoginModal("Sign in to host a live English speaking room.");
      return;
    }
    if (!user?.ageVerified) {
      return;
    }
    setIsCreateOpen(true);
  };

  const handleJoinRoom = (room: SpeakingRoom) => {
    if (authStatus === "guest") {
      openLoginModal("Sign in to join live speaking rooms.");
      return;
    }
    if (!user?.ageVerified) {
      return;
    }
    setJoinedRoom(room);
    setIsMuted(false);
  };

  const handleCreateSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setCreateError(null);

    const parsed = createSpeakingRoomRequestSchema.safeParse({
      name: roomName,
      topic: roomTopic,
      cefrLevel: roomLevel,
      maxParticipants,
      isPrivate,
    });

    if (!parsed.success) {
      setCreateError(
        parsed.error.issues[0]?.message ?? "Please review the room settings."
      );
      return;
    }

    try {
      const created = await createRoomMutation.mutateAsync(parsed.data);
      setIsCreateOpen(false);
      setRoomName("");
      setJoinedRoom(created.room);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Could not create speaking room."
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Community Speaking Rooms
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Join small-group voice rooms (2–5 speakers) over moderated peer audio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void roomsQuery.refetch()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={authStatus === "authenticated" && !user?.ageVerified}
            onClick={handleOpenCreate}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Room
          </Button>
        </div>
      </div>

      {/* Age Verification Safety Boundary */}
      {authStatus === "authenticated" && !user?.ageVerified ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span>
              Age verification is required before joining or hosting live community voice
              rooms.
            </span>
          </div>
          <Link href="/settings">
            <Button variant="outline" size="sm">
              Complete Age Verification
            </Button>
          </Link>
        </div>
      ) : null}

      {/* Active Voice Session Banner */}
      {joinedRoom ? (
        <Card className="border-emerald-300 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="success">Live Room</Badge>
                <Badge variant="info">{joinedRoom.cefrLevel}</Badge>
                <span className="text-xs text-slate-500">
                  Channel: /ws/community (WebRTC signaling ready)
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {joinedRoom.name}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Topic: {joinedRoom.topic} · Host: {joinedRoom.hostDisplayName}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={isMuted ? "outline" : "primary"}
                size="sm"
                onClick={() => setIsMuted((m) => !m)}
              >
                {isMuted ? (
                  <>
                    <MicOff className="h-4 w-4" aria-hidden="true" />
                    Unmute Mic
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" aria-hidden="true" />
                    Mute Mic
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => setJoinedRoom(null)}
              >
                <PhoneOff className="h-4 w-4" aria-hidden="true" />
                Leave Room
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Create Room Drawer */}
      {isCreateOpen ? (
        <Card className="border-blue-300 dark:border-blue-800">
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Host a Speaking Room
            </h2>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Close create room form"
              onClick={() => setIsCreateOpen(false)}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => void handleCreateSubmit(e)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>Room Name</span>
                  <Input
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="e.g. Evening IELTS Part 2 Practice"
                  />
                </label>

                <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>Topic</span>
                  <select
                    value={roomTopic}
                    onChange={(e) => setRoomTopic(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    {TOPIC_PRESETS.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>CEFR Target</span>
                  <select
                    value={roomLevel}
                    onChange={(e) => setRoomLevel(cefrLevelSchema.parse(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    {cefrLevelSchema.options.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <span>Max Participants</span>
                  <select
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
                  >
                    {[2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} speakers
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600"
                  />
                  Invite-only room
                </label>
              </div>

              {createError ? (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {createError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={createRoomMutation.isPending}
                >
                  Launch Room
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["", ...cefrLevelSchema.options] as const).map((lvl) => (
            <button
              key={lvl || "ALL"}
              type="button"
              onClick={() => setCefrFilter(lvl)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                cefrFilter === lvl
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              )}
            >
              {lvl || "All Levels"}
            </button>
          ))}
        </div>

        <select
          aria-label="Filter by speaking topic"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-medium dark:border-slate-700 dark:bg-slate-950"
        >
          <option value="">All Topics</option>
          {TOPIC_PRESETS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </select>
      </div>

      {/* Room Cards */}
      {roomsQuery.isLoading ? (
        <LoadingState label="Finding open speaking rooms..." />
      ) : roomsQuery.isError ? (
        <ErrorState
          message={
            roomsQuery.error instanceof Error
              ? roomsQuery.error.message
              : "Unable to load speaking rooms."
          }
          onRetry={() => void roomsQuery.refetch()}
        />
      ) : !roomsQuery.data || roomsQuery.data.items.length === 0 ? (
        <EmptyState
          title="No open rooms matching your filters"
          description="Create a room or clear filters to join fellow English learners."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roomsQuery.data.items.map((room) => {
            const isFull = room.currentParticipants >= room.maxParticipants;
            return (
              <Card key={room.id} className="flex flex-col justify-between">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge variant="info">{room.cefrLevel}</Badge>
                      {room.isPrivate ? (
                        <Badge variant="warning">
                          <Lock className="h-3 w-3" aria-hidden="true" />
                          Private
                        </Badge>
                      ) : null}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
                      <Users className="h-3.5 w-3.5" aria-hidden="true" />
                      {room.currentParticipants}/{room.maxParticipants}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {room.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Topic: {room.topic} · Host: {room.hostDisplayName}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="w-full"
                    disabled={
                      isFull ||
                      (authStatus === "authenticated" && !canEnterVoiceRooms)
                    }
                    onClick={() => handleJoinRoom(room)}
                  >
                    {isFull ? "Room Full" : "Join Room"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
