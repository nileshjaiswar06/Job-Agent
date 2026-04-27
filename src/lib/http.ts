import axios from "axios";

export const http = axios.create({
  timeout: 30_000,
  headers: {
    "User-Agent": "ai-job-agent/1.0",
  },
});
