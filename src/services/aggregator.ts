import { computeJobId } from "../lib/jobId";
import { jobCoreSchema, jobSchema, type Job, type JobCore } from "../lib/schema";
import { withTimeout } from "../lib/withTimeout";
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

function preferRicherJob(existing: Job, incoming: Job): Job {
  const exDesc = existing.description_snippet?.length ?? 0;
  const inDesc = incoming.description_snippet?.length ?? 0;
  const exApply = Boolean(existing.apply_link?.trim());
  const inApply = Boolean(incoming.apply_link?.trim());

  if (!exDesc && inDesc) return incoming;
  if (!exApply && inApply) return incoming;
  if (inDesc > exDesc) return incoming;
  return existing;
}

/**
 * Fetches all configured sources, normalizes, assigns `job_id`, dedupes by `job_id`
 * (keeps richer row: description snippet or apply link when the other copy is missing).
 */
const SOURCE_FETCH_MS = 40_000;

export async function aggregateJobs(env: {
  YC_JOBS_URL: string;
  GREENHOUSE_BOARDS: string;
  LEVER_SITES: string;
}): Promise<Job[]> {
  const boards = parseList(env.GREENHOUSE_BOARDS);
  const leverSites = parseList(env.LEVER_SITES);

  const [yc, gh, lever, openclaw] = await Promise.all([
    withTimeout(fetchYcJobs(env.YC_JOBS_URL), SOURCE_FETCH_MS, "yc"),
    withTimeout(fetchGreenhouseJobs(boards), SOURCE_FETCH_MS, "greenhouse"),
    withTimeout(fetchLeverJobs(leverSites), SOURCE_FETCH_MS, "lever"),
    withTimeout(fetchOpenClawJobs(), SOURCE_FETCH_MS, "openclaw"),
  ]);

  console.info(
    `[ingest] source rows: yc=${yc.length} greenhouse=${gh.length} lever=${lever.length} openclaw=${openclaw.length}`,
  );

  const merged: JobCore[] = [...yc, ...gh, ...lever, ...openclaw];
  const byId = new Map<string, Job>();

  for (const core of merged) {
    const job = toJob(core);
    if (!job) continue;
    const prev = byId.get(job.job_id);
    if (!prev) {
      byId.set(job.job_id, job);
    } else {
      byId.set(job.job_id, preferRicherJob(prev, job));
    }
  }

  const deduped = Array.from(byId.values());
  console.info(`[ingest] deduped jobs: ${deduped.length}`);

  return deduped;
}


