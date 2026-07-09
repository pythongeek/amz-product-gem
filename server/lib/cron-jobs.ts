import { env } from "./env";

const BASE = "https://api.cron-job.org";

interface CronJobInput {
  title: string;
  url: string;
  schedule: { timezone: string; expiresAt: number; hours: number[]; mdays: number[]; minutes: number[]; months: number[]; wdays: number[] };
  requestMethod: number; // 0=GET, 1=POST, 2=PUT, 3=PATCH, 4=DELETE
  extendedData?: {
    headers: Record<string, string>;
    body: string;
  };
  notification?: {
    onFailure: boolean;
    onSuccess: boolean;
    onDisable: boolean;
  };
}

function authHeaders() {
  if (!env.cronJobsOrgApiKey) {
    throw new Error("CRON_JOBS_ORG_API_KEY not set in environment variables");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${env.cronJobsOrgApiKey}`,
  };
}

export async function createCronJob(job: CronJobInput): Promise<{ jobId: number }> {
  const resp = await fetch(`${BASE}/jobs`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ job }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`cron-jobs.org create failed (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as { jobId: number };
  return data;
}

export async function listCronJobs(): Promise<any[]> {
  const resp = await fetch(`${BASE}/jobs`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`cron-jobs.org list failed (${resp.status}): ${text}`);
  }

  const data = (await resp.json()) as { jobs: any[] };
  return data.jobs || [];
}

export async function deleteCronJob(jobId: number): Promise<void> {
  const resp = await fetch(`${BASE}/jobs/${jobId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`cron-jobs.org delete failed (${resp.status}): ${text}`);
  }
}

export async function triggerCronJob(jobId: number): Promise<void> {
  const resp = await fetch(`${BASE}/jobs/${jobId}/trigger`, {
    method: "GET",
    headers: authHeaders(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`cron-jobs.org trigger failed (${resp.status}): ${text}`);
  }
}

/**
 * Create all required cron jobs for AMZ Product Gem.
 * Call this once after deployment.
 */
export async function setupCronJobs(baseUrl: string): Promise<{ created: number; jobs: Array<{ title: string; jobId: number }> }> {
  const jobs: Array<{ title: string; jobId: number }> = [];

  const commonHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "x-cron-secret": env.cronSecret || "",
  };

  const every2Hours = {
    timezone: "UTC",
    expiresAt: 0, // never expires
    hours: [-1], // every hour
    mdays: [-1], // every day
    minutes: [0], // at minute 0
    months: [-1], // every month
    wdays: [-1], // every weekday
  };

  const every5Minutes = {
    timezone: "UTC",
    expiresAt: 0,
    hours: [-1],
    mdays: [-1],
    minutes: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55],
    months: [-1],
    wdays: [-1],
  };

  // Job 1: Process pending research jobs every 5 minutes
  const researchJob = await createCronJob({
    title: "AMZ-ProcessPendingResearch",
    url: `${baseUrl}/api/cron/process-research`,
    schedule: every5Minutes,
    requestMethod: 1, // POST
    extendedData: {
      headers: commonHeaders,
      body: JSON.stringify({}),
    },
    notification: { onFailure: true, onSuccess: false, onDisable: true },
  });
  jobs.push({ title: "Process Pending Research", jobId: researchJob.jobId });

  // Job 2: Check product alerts every 2 hours
  const alertJob = await createCronJob({
    title: "AMZ-CheckAlerts",
    url: `${baseUrl}/api/cron/check-alerts`,
    schedule: every2Hours,
    requestMethod: 1, // POST
    extendedData: {
      headers: commonHeaders,
      body: JSON.stringify({}),
    },
    notification: { onFailure: true, onSuccess: false, onDisable: true },
  });
  jobs.push({ title: "Check Product Alerts", jobId: alertJob.jobId });

  return { created: jobs.length, jobs };
}
