
interface OpenJobStreamOptions {
    jobId: string;
    onMessage: (event: any, lsatEventId: string) => void;
    onTerminate: (event: any) => void;
    onError?: (error: Event) => void;
    lastEventId: string | null
}

const API_BASE_URL = "http://localhost:8000";

export function openJobStream({
    jobId,
    onMessage,
    onTerminate,
    onError,
    lastEventId
}: OpenJobStreamOptions): EventSource {
    const params = new URLSearchParams();
    if (lastEventId !== null) {
        console.log("Appending lastEventId to params:", lastEventId);
        params.append("last_event_id", lastEventId);
    }
    const eventSource = new EventSource(`${API_BASE_URL}/jobs/${jobId}?${params.toString()}`);

    eventSource.addEventListener("message", (event: MessageEvent) => {
        console.log(`Event: ${event.type} | ${event.data} | ${event.lastEventId}`)
        onMessage(event.data, event.lastEventId)
    });

    eventSource.addEventListener("terminate", (event: MessageEvent) => {
        onTerminate(event.data)
    })
    eventSource.onerror = (error) => {
        onError?.(error);
    };

    return eventSource;
}