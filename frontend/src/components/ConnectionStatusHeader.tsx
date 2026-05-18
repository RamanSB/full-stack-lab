type ConnectionStatusHeaderProps = {
    isConnected: boolean
    clientId: string
    onConnect?: () => void
    onDisconnect?: () => void
}

export function ConnectionStatusHeader({ isConnected, clientId, onConnect, onDisconnect }: ConnectionStatusHeaderProps) {
    return (
        <div className="demo-panel-header" style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <span className="demo-panel-title connection-status-title">
                <span
                    className={`connection-status-dot ${isConnected ? "connection-status-dot--connected" : "connection-status-dot--disconnected"}`}
                    title={isConnected ? "WebSocket Connected" : "WebSocket Not Connected"}
                />
                {isConnected ? `Connected as ${clientId}` : "Not connected"}
            </span>

            <button
                className="secondary-button connection-status-action"
                onClick={isConnected ? onDisconnect : onConnect}
                type="button"
            >
                {isConnected ? "Disconnect" : "Connect"}
            </button>
        </div>
    )
}
