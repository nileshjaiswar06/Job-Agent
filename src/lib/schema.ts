import { z } from "zod";

/** Fields produced by sources before `job_id` is attached */
export const jobCoreSchema = z.object({
  source: z.string().min(1),
  company: z.string().min(1),
  title: z.string().min(1),
  apply_link: z.string().min(1).optional(),
  canonical_job_url: z.string().min(1).optional(),
  location: z.string().optional(),
  description_snippet: z.string().optional(),
  posted_at: z.string().optional(),
});

export type JobCore = z.infer<typeof jobCoreSchema>;

export const jobSchema = jobCoreSchema.extend({
  job_id: z.string().min(1),
});

export type Job = z.infer<typeof jobSchema>;


