import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectionStatusHeader } from "../components/ConnectionStatusHeader";
import { createWsUser, getCreateWsUserErrorMessage } from "../features/websockets/api";
import "../styles/websocket-demo.css"

const CLIENT_NAME_STORAGE_KEY = "websocket_client_name"

function getStoredClientName(): string | null {
    const name = sessionStorage.getItem(CLIENT_NAME_STORAGE_KEY)?.trim()
    return name || null
}

export default function WebsocketPage() {

    const navigate = useNavigate()
    const [clientName, setClientName] = useState<string | null>(getStoredClientName)

    return <section className="page-card">
        <div className="page-header">
            <div>
                <div className="section-label">Websocket Demo</div>
                <h1 className="page-title">Websockets</h1>
                <p className="page-description">
                    We demonstrate that two clients can connect to a server via websockets and can exchange messages.
                </p>
            </div>

            <button className="secondary-button" onClick={() => {
                console.log("Navigating back to home...");
                navigate("/");
            }}>
                Back
            </button>
        </div>
        {clientName ? (
            <ChatInterface clientId={clientName} />
        ) : (
            <NameEntryForm
                onSubmit={(name) => {
                    sessionStorage.setItem(CLIENT_NAME_STORAGE_KEY, name)
                    setClientName(name)
                }}
            />
        )}
    </section>
}

type NameEntryFormProps = {
    onSubmit: (name: string) => void
}

function NameEntryForm({ onSubmit }: NameEntryFormProps) {
    const [nameInput, setNameInput] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault()
        const name = nameInput.trim().toLowerCase()
        if (!name || isSubmitting) return

        setError(null)
        setIsSubmitting(true)
        try {
            await createWsUser({ username: name })
            onSubmit(name)
        } catch (err) {
            setError(getCreateWsUserErrorMessage(err))
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="demo-panel name-entry-panel">
            <div className="name-entry-content">
                <h2 className="demo-panel-title name-entry-title">Choose a display name</h2>
                <p className="name-entry-description">
                    Enter a name to join the chat. Other clients will see this name on your messages.
                </p>
                {error && <p className="name-entry-error">{error}</p>}
                <form className="name-entry-form" onSubmit={handleSubmit}>
                    <input
                        className="name-entry-input"
                        type="text"
                        placeholder="Your name"
                        value={nameInput}
                        maxLength={32}
                        autoFocus
                        disabled={isSubmitting}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                            setNameInput(event.target.value)
                            if (error) setError(null)
                        }}
                    />
                    <button
                        className="primary-button name-entry-submit"
                        type="submit"
                        disabled={nameInput.trim() === "" || isSubmitting}
                    >
                        {isSubmitting ? "Joining…" : "Continue"}
                    </button>
                </form>
            </div>
        </div>
    )
}

export type Message = {
    user_id: string
    content: string
    sent_at: string // ISO-8601 Timestamp
}

function formatMessageTime(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return ""

    const now = new Date()
    const time = date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
    })

    if (date.toDateString() === now.toDateString()) return time

    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (date.toDateString() === yesterday.toDateString()) {
        return `Yesterday, ${time}`
    }

    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date)
}

type ChatBubbleProps = {
    message: Message
    isSender: boolean
}

function ChatBubble({ message, isSender }: ChatBubbleProps) {
    return (
        <div className={`chat-bubble ${isSender ? "self" : "other"}`}>
            {!isSender && (
                <span className="chat-bubble-sender" title={message.user_id}>
                    {message.user_id}
                </span>
            )}
            <p className="chat-bubble-content">{message.content}</p>
            <div className="chat-bubble-meta">
                {isSender && (
                    <span className="chat-bubble-client" title={message.user_id}>
                        You
                    </span>
                )} {"• "}
                <time className="chat-bubble-time" dateTime={message.sent_at}>
                    {formatMessageTime(message.sent_at)}
                </time>
            </div>
        </div>
    )
}

type ChatInterfaceProps = {
    clientId: string
}

function ChatInterface({ clientId }: ChatInterfaceProps) {

    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isConnected, setIsConnecteed] = useState(false)
    const wsRef = useRef<WebSocket | null>(null)

    const handleConnect = async () => {
        try {
            console.log(`ws: ${import.meta.env.VITE_WEBSOCKET_CONNECTION_URL}`)
            wsRef.current = new WebSocket(`${import.meta.env.VITE_WEBSOCKET_CONNECTION_URL}/?user=${clientId}`)
            // on open (websocket connection established)
            wsRef.current.onopen = () => {
                setIsConnecteed(true)
                console.log(`${clientId} connected`)
            }

            wsRef.current.onmessage = (ev: MessageEvent) => {
                try {
                    const msg = JSON.parse(ev.data)
                    const newMessage: Message = {
                        user_id: msg.sender,
                        content: msg.content,
                        sent_at: msg.sent_at
                    }
                    setMessages(messages => [...messages, newMessage])
                } catch (error) {
                    console.error('Failed to parse incoming message:', error)
                }
            }


            // on close (websocket disconnected)
            wsRef.current.onclose = () => {
                setIsConnecteed(false)
                console.log(`${clientId} disconnected`)
            }

        } catch (error) {
            console.log(``)
        }
    }

    const handleDisconnect = async () => {
        try {
            wsRef.current?.close()
            wsRef.current = null
        } catch (error) {
            console.log(``)
        }
    }

    const sendMessage = () => {
        if (!wsRef.current) {
            console.warn("Attempting to send message without a valid websocket connection.")
            return
        }
        let message: string = input.trim()
        let messageObject = {
            "sender": clientId,
            "content": message
        }
        wsRef.current.send(JSON.stringify(messageObject))
        setInput("")
    }




    return <div className="demo-panel">
        <ConnectionStatusHeader isConnected={isConnected} clientId={clientId} onConnect={handleConnect} onDisconnect={handleDisconnect} />


        <div className="chat-pane">
            <div className="chat-messages">

                {messages.map((message, idx) => {
                    const isSender = message.user_id === clientId
                    return (
                        <div
                            key={`${message.sent_at}-${message.user_id}-${idx}`}
                            className={`chat-message-row ${isSender ? "self" : "other"}`}
                        >
                            <ChatBubble message={message} isSender={isSender} />
                        </div>
                    )
                })}
            </div>



            <div className="chat-input-row">
                <input
                    className="chat-input"
                    placeholder="Send a message..."
                    onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        setInput(event.target.value)
                    }}
                    value={input}

                />

                <button
                    className="primary-button chat-send-button"
                    disabled={!isConnected || input === ""}
                    onClick={sendMessage}
                >
                    Send
                </button>
            </div>
        </div>
    </div>
}
