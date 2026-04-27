import { http } from "../lib/http";
import type { JobCore } from "../lib/schema";

type YcApiJob = {
  company_name?: string;
  title?: string;
  location?: string;
  description?: string;
  apply_url?: string;
  created_at?: string;
};

type YcApiResponse = {
  jobs?: YcApiJob[];
};

function snippet(text: string | undefined, max = 400): string | undefined {
  if (!text) return undefined;
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\u2026`;
}

export async function fetchYcJobs(jobsUrl: string): Promise<JobCore[]> {
  let res;
  try {
    res = await http.get<YcApiResponse>(jobsUrl, {
      timeout: 30_000,
      validateStatus: () => true,
    });
  } catch {
    return [];
  }

  if (res.status < 200 || res.status >= 300 || !res.data?.jobs) {
    console.warn(
      `[yc] ${jobsUrl} -> HTTP ${res.status}; no jobs array (YC often 404; use Greenhouse/Lever until URL is updated)`,
    );
    return [];
  }

  const out: JobCore[] = [];
  for (const job of res.data.jobs) {
    const company = (job.company_name ?? "Unknown").trim() || "Unknown";
    const title = (job.title ?? "Untitled").trim() || "Untitled";
    const applyRaw = job.apply_url?.trim();
    const apply = applyRaw || undefined;
    const canonical = apply;

    out.push({
      source: "yc",
      company,
      title,
      apply_link: apply,
      canonical_job_url: canonical,
      location: job.location?.trim() || undefined,
      description_snippet: snippet(job.description),
      posted_at: job.created_at,
    });
  }
  return out;
}
