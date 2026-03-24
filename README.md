# Learning Log

## 📅 Date: 2026-03-23

### 📝 What I Learned
- How to implement Server Sent Events [FastAPI]
- How to handle CORS error

### 🔖 Subtopics
- SSE FastAPI
- EventSource (Frontend)
- CORS - Middleware

### Notes

#### How Server Sent Events (SSE) Work in FastAPI

SSE (Server Sent Events) connections are started using GET endpoints. The server maintains an open connection, allowing it to push events to the client as they become available. In FastAPI, this is achieved by returning an `EventSourceResponse`, which automatically sets the `Content-Type` header to `text/event-stream`. This special header tells the browser to keep the connection open and expect a stream of events.

The body of the endpoint should use `yield` to send events gradually over time. With FastAPI's `ServerSentEvent`, you can populate key fields like `data`, `event`, `id`, and `retry` for each message sent to the frontend.

Example of a single Server Sent Event message:
```
id: 1
event: message
data: hello
retry: 10000
```

#### CORS

When a request is made from one server to another server (A server running on a localhost is denoted by a combination of: the domain+host+port). The server which hosts the endpoints i.e. servers the request must whitelist the requesting server if they do not share the same origin, this is achieved by configuring `CORSMiddleware` and ensuring our `FastAPI` app uses/adds this middleware:

```python
app: FastAPI = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, **config)
```

#### Frontend EventSource / Handling SSE Streams

The Frontend must leverage a browser API known as `EventSource`, we pass the endpoint path
of the SSE endpoint. We then add an event listener for the particular event_type and we can handle the incoming responses in our event handler, typically by appending the event chunks / messages to some state that can be rendered.

---

> **Template: Copy/Paste this for each entry**
>
> ## 📅 Date: YYYY-MM-DD
> 
> ### 📝 What I Learned
> - Brief summary here.
> 
> ### 🗒️ Details & Reflections
> More elaborate notes, context, or thoughts about the day's learning.
> 
> ### 🔖 Subtopics
> - Subtopic 1
> - Subtopic 2

---
