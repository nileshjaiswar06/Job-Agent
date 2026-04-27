import "dotenv/config";
import Fastify from "fastify";
import { aggregateJobs } from "./services/aggregator";

const PORT = Number(process.env.PORT) || 3000;

const env = {
  YC_JOBS_URL:
    process.env.YC_JOBS_URL ??
    "https://www.workatastartup.com/api/v1/jobs",
  GREENHOUSE_BOARDS: process.env.GREENHOUSE_BOARDS ?? "",
  LEVER_SITES: process.env.LEVER_SITES ?? "",
};

const app = Fastify({ logger: true });

app.get("/health", async () => ({ ok: true as const }));

app.get("/ingest", async (_req, reply) => {
  try {
    const jobs = await aggregateJobs(env);
    return reply.send(jobs);
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ error: "ingest_failed" });
  }
});

app.get("/v1/ingest", async (_req, reply) => {
  try {
    const data = await aggregateJobs(env);
    return reply.send({
      version: "1",
      generatedAt: new Date().toISOString(),
      count: data.length,
      data,
    });
  } catch (err) {
    app.log.error(err);
    return reply.status(500).send({ error: "ingest_failed", version: "1" });
  }
});

app
  .listen({ port: PORT, host: "0.0.0.0" })
  .then((address) => {
    app.log.info(`Listening on ${address}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });