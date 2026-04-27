import { http } from "../lib/http";
import type { JobCore } from "../lib/schema";

type GhJob = {
  id?: number;
  title?: string;
  absolute_url?: string;
  location?: { name?: string } | string;
  content?: string;
  updated_at?: string;
  first_published?: string;
};

type GhBoardResponse = {
  jobs?: GhJob[];
};

function locationName(loc: GhJob["location"]): string | undefined {
  if (!loc) return undefined;
  if (typeof loc === "string") return loc.trim() || undefined;
  return loc.name?.trim() || undefined;
}

function snippet(html: string | undefined, max = 400): string | undefined {
  if (!html) return undefined;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\u2026`;
}

export async function fetchGreenhouseJobs(boardTokens: string[]): Promise<JobCore[]> {
  const results: JobCore[] = [];

  for (const token of boardTokens) {
    const t = token.trim().toLowerCase();
    if (!t) continue;

    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(t)}/jobs`;
    try {
      const res = await http.get<GhBoardResponse>(url, { timeout: 25_000 });
      const jobs = res.data.jobs ?? [];

      for (const job of jobs) {
        const title = (job.title ?? "Untitled").trim() || "Untitled";
        const apply = job.absolute_url?.trim();
        results.push({
          source: `greenhouse:${t}`,
          company: t,
          title,
          apply_link: apply,
          canonical_job_url: apply,
          location: locationName(job.location),
          description_snippet: snippet(job.content),
          posted_at: job.first_published ?? job.updated_at,
        });
      }
    } catch {
      // Skip failing boards
    }
  }

  return results;
}

