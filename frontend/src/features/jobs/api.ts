import { api } from "../../lib/api";
import type { Job, JobCreate } from "./types";

export async function createJob(job: JobCreate): Promise<Job> {
    console.log(`JobCreate: ${JSON.stringify(job)}`)
    const response = await api.post<Job>("/jobs/", job);
    return response.data;
}