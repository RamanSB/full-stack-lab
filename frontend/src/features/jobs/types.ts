export type JobType = "TEXT_STREAM_DEMO";

export type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

export interface JobCreate {
    job_type: JobType;
    payload?: Record<string, unknown>;
    meta?: Record<string, unknown>;
}

export interface Job {
    id: string;
    job_type: JobType;
    status: JobStatus;
    payload?: Record<string, unknown>;
    meta?: Record<string, unknown>;
    created_at?: string;
    updated_at?: string;
}