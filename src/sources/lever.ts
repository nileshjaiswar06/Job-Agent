import { http } from "../lib/http";
import type { JobCore } from "../lib/schema";

type LeverPosting = {
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  categories?: { commitment?: string; location?: string; team?: string };
};

type LeverResponse = {
  data?: LeverPosting[];
};

function snippet(text: string | undefined, max = 400): string | undefined {
  if (!text) return undefined;
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\u2026`;
}

function locationFromPosting(p: LeverPosting): string | undefined {
  const loc = p.categories?.location?.trim();
  if (loc) return loc;
  return undefined;
}

export async function fetchLeverJobs(siteSlugs: string[]): Promise<JobCore[]> {
  if (!siteSlugs.length) return [];

  const results: JobCore[] = [];

  for (const slug of siteSlugs) {
    const s = slug.trim();
    if (!s) continue;

    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(s)}?mode=json`;
    try {
      const res = await http.get<LeverResponse>(url, { timeout: 25_000 });
      const postings = res.data.data ?? [];

      for (const p of postings) {
        const title = (p.text ?? "Untitled").trim() || "Untitled";
        const hosted = p.hostedUrl?.trim();
        const apply = p.applyUrl?.trim() ?? hosted;

        results.push({
          source: `lever:${s}`,
          company: s,
          title,
          apply_link: apply,
          canonical_job_url: hosted ?? apply,
          location: locationFromPosting(p),
          description_snippet: snippet(p.text),
          posted_at:
            typeof p.createdAt === "number"
              ? new Date(p.createdAt).toISOString()
              : undefined,
        });
      }
    } catch {
      // Skip failing sites
    }
  }

  return results;
}

