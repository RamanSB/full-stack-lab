import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ConnectionStatusHeader } from "../components/ConnectionStatusHeader";
import {
    createWsUser,
    getCreateWsUserErrorMessage,
    type WsUser,
} from "../features/websockets/api";
import "../styles/websocket-demo.css"

const CLIENT_USER_STORAGE_KEY = "websocket_client_user"

function getStoredClientUser(): WsUser | null {
    const raw = sessionStorage.getItem(CLIENT_USER_STORAGE_KEY)
    if (!raw) return null
    try {
        const user = JSON.parse(raw) as WsUser
        if (user.id && user.username) return user
    } catch {
        // ignore invalid stored value
    }
    return null
}

export default function WebsocketPage() {

    const navigate = useNavigate()
    const [wsUser, setWsUser] = useState<WsUser | null>(getStoredClientUser)

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
        {wsUser ? (
            <ChatInterface user={wsUser} />
        ) : (
            <NameEntryForm
                onSubmit={(user) => {
                    sessionStorage.setItem(CLIENT_USER_STORAGE_KEY, JSON.stringify(user))
                    setWsUser(user)
                }}
            />
        )}
    </section>
}

type NameEntryFormProps = {
    onSubmit: (user: WsUser) => void
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
            const user = await createWsUser({ username: name })
            onSubmit(user)
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
    sender_id: string
    sender_name?: string
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
                <span className="chat-bubble-sender" title={message.sender_id}>
                    {message.sender_name ?? message.sender_id}
                </span>
            )}
            <p className="chat-bubble-content">{message.content}</p>
            <div className="chat-bubble-meta">
                {isSender && (
                    <span className="chat-bubble-client" title={message.sender_id}>
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
    user: WsUser
}

function ChatInterface({ user }: ChatInterfaceProps) {

    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isConnected, setIsConnecteed] = useState(false)
    const wsRef = useRef<WebSocket | null>(null)

    const handleConnect = async () => {
        try {
            console.log(`ws: ${import.meta.env.VITE_WEBSOCKET_CONNECTION_URL}`)
            wsRef.current = new WebSocket(`${import.meta.env.VITE_WEBSOCKET_CONNECTION_URL}/?user=${user.username}`)
            // on open (websocket connection established)
            wsRef.current.onopen = () => {
                setIsConnecteed(true)
                console.log(`${user.username} connected`)
            }

            wsRef.current.onmessage = (ev: MessageEvent) => {
                try {
                    const msg = JSON.parse(ev.data)
                    const newMessage: Message = {
                        sender_id: msg.sender_id,
                        sender_name: msg.sender,
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
                console.log(`${user.username} disconnected`)
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
        const content = input.trim()
        if (!content) return

        const messageObject = {
            sender_id: user.id,
            sender: user.username,
            content,
        }
        wsRef.current.send(JSON.stringify(messageObject))
        setInput("")
    }




    return <div className="demo-panel">
        <ConnectionStatusHeader isConnected={isConnected} clientId={user.username} onConnect={handleConnect} onDisconnect={handleDisconnect} />


        <div className="chat-pane">
            <div className="chat-messages">

                {messages.map((message, idx) => {
                    const isSender = message.sender_id === user.id
                    return (
                        <div
                            key={`${message.sent_at}-${message.sender_id}-${idx}`}
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
