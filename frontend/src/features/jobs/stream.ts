
interface OpenJobStreamOptions {
    jobId: string;
    onMessage: (event: any) => void;
    onError?: (error: Event) => void;
}

const API_BASE_URL = "http://localhost:8000";

export function openJobStream({
    jobId,
    onMessage,
    onError,
}: OpenJobStreamOptions): EventSource {
    const eventSource = new EventSource(`${API_BASE_URL}/jobs/${jobId}?word_count=30`);

    eventSource.addEventListener("message", (event: MessageEvent) => {
        onMessage(event.data)
    });

    eventSource.onerror = (error) => {
        onError?.(error);
    };

    return eventSource;
}