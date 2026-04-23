import { computeJobId } from "../lib/jobId";
import { jobCoreSchema, jobSchema, type Job, type JobCore } from "../lib/schema";
import { fetchGreenhouseJobs } from "../sources/greenhouse";
import { fetchLeverJobs } from "../sources/lever";
import { fetchOpenClawJobs } from "../sources/openclaw";
import { fetchYcJobs } from "../sources/yc";

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toJob(core: JobCore): Job | null {
  const parsed = jobCoreSchema.safeParse(core);
  if (!parsed.success) return null;

  const c = parsed.data;
  const job_id = computeJobId({
    source: c.source,
    company: c.company,
    title: c.title,
    apply_link: c.apply_link,
    canonical_job_url: c.canonical_job_url,
  });

  const withId: Job = { ...c, job_id };
  const final = jobSchema.safeParse(withId);
  return final.success ? final.data : null;
}

/**
 * Fetches all configured sources, normalizes, assigns `job_id`, dedupes by `job_id` (first wins).
 */
export async function aggregateJobs(env: {
  YC_JOBS_URL: string;
  GREENHOUSE_BOARDS: string;
  LEVER_SITES: string;
}): Promise<Job[]> {
  const boards = parseList(env.GREENHOUSE_BOARDS);
  const leverSites = parseList(env.LEVER_SITES);

  const [yc, gh, lever, openclaw] = await Promise.all([
    fetchYcJobs(env.YC_JOBS_URL),
    fetchGreenhouseJobs(boards),
    fetchLeverJobs(leverSites),
    fetchOpenClawJobs(),
  ]);

  const merged: JobCore[] = [...yc, ...gh, ...lever, ...openclaw];
  const byId = new Map<string, Job>();

  for (const core of merged) {
    const job = toJob(core);
    if (!job) continue;
    if (!byId.has(job.job_id)) {
      byId.set(job.job_id, job);
    }
  }

  return Array.from(byId.values());
}

