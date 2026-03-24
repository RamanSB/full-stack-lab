import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createJob } from "../features/jobs/api";
import { openJobStream } from "../features/jobs/stream";
import type { Job } from "../features/jobs/types";


// TODO: Ensure stream can be resumed, update the status on frontend.
// Color text in a different color everytime stream is stopped and resumed
// Use the Last-Event-ID to track this. 
export default function SSEPage() {
    const navigate = useNavigate();
    const eventSourceRef = useRef<EventSource | null>(null);
    const lastEventIdRef = useRef<string | null>(null)
    const resumptionCountRef = useRef<number>(0)

    const [job, setJob] = useState<Job | null>(null);
    const [isCreatingJob, setIsCreatingJob] = useState(false);
    const [isStreamComplete, setIsStreamComplete] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [chunks, setChunks] = useState<string[]>([]);
    const [status, setStatus] = useState<string>("IDLE");
    const [error, setError] = useState<string | null>(null);


    const NUMBER_OF_WORDS: number = 50

    useEffect(() => {
        // Debug: component mounted
        console.log("SSEPage mounted");
        return () => {
            // Debug: cleanup event source
            console.log("Cleaning up EventSource...");
            eventSourceRef.current?.close();
        };
    }, []);

    async function handleStartDemo() {
        try {
            setError(null);
            setChunks([]);
            setJob(null);
            setStatus("CREATING_JOB");
            setIsCreatingJob(true);

            console.log("Creating job...");
            const createdJob = await createJob({
                job_type: "TEXT_STREAM_DEMO",
                payload: {
                    word_count: NUMBER_OF_WORDS,
                },
                meta: {
                    source: "frontend-demo",
                },
            });
            console.log("Job created:", createdJob);

            setJob(createdJob);
            setStatus(createdJob.status);
            setIsCreatingJob(false);
            setIsStreaming(true);
            setIsStreamComplete(false)

            eventSourceRef.current?.close();

            eventSourceRef.current = openJobStream({
                jobId: createdJob.id,
                onMessage: (data: string, lastEventId: string) => {
                    lastEventIdRef.current = lastEventId
                    console.log("Stream event received:", data);
                    setChunks((prev) => [...prev, data])
                },
                onTerminate: (data: string) => {
                    console.log("Final stream event received:", data)
                    setChunks((prev) => [...prev, data])
                    eventSourceRef.current?.close()
                    setIsStreaming(false);
                    setIsStreamComplete(true)
                },
                onError: () => {
                    console.log("Stream connection failed.");
                    setIsStreaming(false);
                    setError("Stream connection failed.");
                },
                lastEventId: null
            });
            console.log("SSE connection opened for jobId:", createdJob.id);
        } catch (err) {
            setIsCreatingJob(false);
            setIsStreaming(false);
            setStatus("FAILED");
            setError("Failed to create job.");
            console.error("Error in handleStartDemo:", err);
        }
    }

    function handleStopStream() {
        console.log("Stopping stream...");
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
        setJob(null)
        setChunks([])
        setStatus()
    }

    function handlePauseStream() {
        console.log("Pausing stream...")
        eventSourceRef.current?.close()
        setIsStreaming(false);
    }

    function handleResumeStream() {
        console.log(`Resuming stream for job id: ${job?.id}`)
        resumptionCountRef.current += 1
        setIsStreaming(true);
        eventSourceRef.current = openJobStream({
            jobId: job?.id!, // The button would be disabled if job doesn't exist.
            onMessage: (data: string, lastEventId: string) => {
                lastEventIdRef.current = lastEventId
                console.log("Stream event received:", data);
                setChunks((prev) => [...prev, data])
            },
            onTerminate: (data: string) => {
                console.log("Final stream event received:", data)
                setChunks((prev) => [...prev, data])
                eventSourceRef.current?.close()
                setIsStreaming(false);
                setIsStreamComplete(true)
            },
            onError: () => {
                console.log("Stream connection failed.");
                setIsStreaming(false);
                setError("Stream connection failed.");
            },
            lastEventId: lastEventIdRef.current
        });
    }

    return (
        <section className="page-card">
            <div className="page-header">
                <div>
                    <div className="section-label">Streaming demo</div>
                    <h1 className="page-title">Server Sent Events</h1>
                    <p className="page-description">
                        Create a job, receive a job ID from the backend, and stream text
                        chunks into the UI over SSE.
                    </p>
                </div>

                <button className="secondary-button" onClick={() => {
                    console.log("Navigating back to home...");
                    navigate("/");
                }}>
                    Back
                </button>
            </div>

            <div className="controls-row">
                <button
                    className="primary-button"
                    onClick={handleStartDemo}
                    disabled={isCreatingJob || isStreaming}
                >
                    {isCreatingJob ? "Creating Job..." : isStreaming ? "Streaming..." : "Start SSE Demo"}
                </button>

                <button
                    className="secondary-button"
                    onClick={handleStopStream}
                    disabled={!isStreaming}
                >
                    Stop Stream
                </button>
                <button
                    className="secondary-button"
                    onClick={handlePauseStream}
                    disabled={!isStreaming}
                >
                    Pause Stream
                </button>
                <button
                    className="secondary-button"
                    onClick={handleResumeStream}
                    disabled={!job || isStreaming || isStreamComplete}
                >
                    Resume Stream
                </button>
            </div>

            <div className="status-grid">
                <div className="status-card">
                    <div className="status-label">Job ID</div>
                    <div className="status-value status-mono">
                        {job?.id ?? "Not created yet"}
                    </div>
                </div>

                <div className="status-card">
                    <div className="status-label">Status</div>
                    <div className="status-value">{status}</div>
                </div>

                <div className="status-card">
                    <div className="status-label">Chunks Received</div>
                    <div className="status-value">{chunks.length}</div>
                </div>
            </div>

            <div className="demo-panel">
                <div className="demo-panel-header">
                    <span className="demo-dot" />
                    <span className="demo-panel-title">Stream Output</span>
                </div>

                <div className="demo-output">
                    {error ? (
                        <p className="error-text">{error}</p>
                    ) : chunks.length === 0 ? (
                        <p className="demo-placeholder">
                            Start the demo to create a job and stream text chunks here.
                        </p>
                    ) : (
                        <div className="stream-text">
                            {chunks.join(" ")}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}