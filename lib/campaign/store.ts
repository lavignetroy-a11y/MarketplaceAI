import { randomUUID } from 'crypto';
import type { CampaignJob, CampaignStatus, RequestedImageCount, SourcePhoto } from './types';

// In-memory job store. Good enough for a single long-running Node process
// (`next dev` / `next start`). It does NOT survive server restarts and will
// NOT work across multiple serverless function instances -- if this is ever
// deployed to a serverless platform (e.g. default Vercel functions), this
// needs to be swapped for a real queue/database (e.g. Redis, Postgres).
const jobs = new Map<string, CampaignJob>();

export function createJob(
  requestedCount: RequestedImageCount,
  sellerNotes: string,
  sources: SourcePhoto[],
): CampaignJob {
  const job: CampaignJob = {
    id: randomUUID(),
    status: 'queued',
    requestedCount,
    sellerNotes,
    sources,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): CampaignJob | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, patch: Partial<CampaignJob>): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch, { updatedAt: Date.now() });
}

export function setStatus(id: string, status: CampaignStatus, statusMessage?: string): void {
  updateJob(id, { status, statusMessage });
}
