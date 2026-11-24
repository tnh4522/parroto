import { randomUUID } from "node:crypto";
import {
  Injectable,
  type OnModuleDestroy,
} from "@nestjs/common";
import { Queue } from "bullmq";
import { getAppEnv } from "../config/env";

export const QUEUE_NAMES = {
  MEDIA_INGESTION: "media-ingestion",
  AI_TRANSCRIPTION: "ai-transcription",
  SPEECH_ASSESSMENT: "speech-assessment",
  AUDIO_VERIFICATION: "audio-verification",
  EXAM_MAINTENANCE: "exam-maintenance",
  LEADERBOARD_ROLLUP: "leaderboard-rollup",
  NOTIFICATIONS_DISPATCH: "notifications-dispatch",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export interface EnqueuedJobRecord {
  id: string;
  queueName: QueueName;
  jobName: string;
  data: Record<string, unknown>;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly queues = new Map<QueueName, Queue>();
  private readonly useMemory: boolean;
  readonly memoryJobs: EnqueuedJobRecord[] = [];

  constructor() {
    const env = getAppEnv();
    this.useMemory =
      env.NODE_ENV === "test" || env.REDIS_URL.trim().toLowerCase() === "memory";
  }

  private getOrCreateQueue(name: QueueName): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, {
        connection: { url: getAppEnv().REDIS_URL },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: "exponential", delay: 10000 },
          removeOnComplete: 500,
          removeOnFail: 1000,
        },
      });
      this.queues.set(name, queue);
    }
    return queue;
  }

  async enqueue(
    queueName: QueueName,
    jobName: string,
    data: Record<string, unknown>
  ): Promise<{ jobId: string }> {
    if (this.useMemory) {
      const id = `job-${randomUUID()}`;
      this.memoryJobs.push({ id, queueName, jobName, data });
      return { jobId: id };
    }

    const queue = this.getOrCreateQueue(queueName);
    const job = await queue.add(jobName, data);
    return { jobId: String(job.id ?? randomUUID()) };
  }

  async onModuleDestroy(): Promise<void> {
    for (const queue of this.queues.values()) {
      await queue.close();
    }
    this.queues.clear();
  }
}
