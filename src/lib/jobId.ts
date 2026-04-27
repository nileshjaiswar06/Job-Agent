import { createHash } from "node:crypto";

function sha256(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export type JobIdInput = {
  source: string;
  company: string;
  title: string;
  apply_link?: string;
  canonical_job_url?: string;
};

/**
 * Primary: sha256(source + "|" + apply_link)
 * Fallback: sha256(source + "|" + canonical_job_url)
 * Last resort: sha256(source + "|" + company + "|" + title) when both URLs missing
 */
export function computeJobId(input: JobIdInput): string {
  const apply = input.apply_link?.trim();
  if (apply) {
    return sha256(`${input.source}|${apply}`);
  }
  const canonical = input.canonical_job_url?.trim();
  if (canonical) {
    return sha256(`${input.source}|${canonical}`);
  }
  return sha256(`${input.source}|${input.company}|${input.title}`);
}


