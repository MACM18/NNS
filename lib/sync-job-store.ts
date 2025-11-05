type JobStatus = "pending" | "in-progress" | "done" | "error";

interface JobRecord {
  id: string;
  status: JobStatus;
  message?: string;
  startedAt: string;
  finishedAt?: string;
  result?: any;
}

const store = new Map<string, JobRecord>();

export function createJob(id: string, message?: string) {
  const rec: JobRecord = {
    id,
    status: "pending",
    message: message || "Queued",
    startedAt: new Date().toISOString(),
  };
  store.set(id, rec);
  return rec;
}

export function setJobInProgress(id: string, message?: string) {
  const rec = store.get(id);
  if (!rec) return null;
  rec.status = "in-progress";
  rec.message = message || rec.message;
  store.set(id, rec);
  return rec;
}

export function setJobDone(id: string, result?: any) {
  const rec = store.get(id);
  if (!rec) return null;
  rec.status = "done";
  rec.result = result;
  rec.finishedAt = new Date().toISOString();
  store.set(id, rec);
  return rec;
}

export function setJobError(id: string, message?: string) {
  const rec = store.get(id);
  if (!rec) return null;
  rec.status = "error";
  rec.message = message || rec.message || "Error";
  rec.finishedAt = new Date().toISOString();
  store.set(id, rec);
  return rec;
}

export function getJob(id: string) {
  return store.get(id) ?? null;
}

export function listJobs() {
  return Array.from(store.values());
}

export default {
  createJob,
  setJobInProgress,
  setJobDone,
  setJobError,
  getJob,
  listJobs,
};
