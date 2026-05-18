import uuid
from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from pydantic import BaseModel
from sqlmodel import Session, col, select

from backend.app.deps import SessionDep
from backend.app.models import Message, MessageDelivery, User

router = APIRouter(prefix="/ws", tags=["websockets"])


class UserCreate(BaseModel):
    username: str


def _parse_message_id(message_id_raw: Any) -> uuid.UUID:
    if isinstance(message_id_raw, uuid.UUID):
        return message_id_raw
    return uuid.UUID(str(message_id_raw))


def persist_message(data: dict[str, Any], session: Session) -> None:
    sender_id = data["sender_id"]
    message = Message(
        sender_id=sender_id,
        content=data["content"],
        sent_at=data["sent_at"],
    )
    session.add(message)
    session.commit()
    session.refresh(message)

    recipient_ids = session.exec(select(User.id).where(User.id != sender_id)).all()
    session.add_all(
        MessageDelivery(
            message_id=message.id,
            recipient_id=recipient_id,
            delivered_at=None,
        )
        for recipient_id in recipient_ids
    )
    session.commit()
    data["message_id"] = str(message.id)


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections: dict[str, WebSocket] = {}

    # TODO: Resume delivery of messages upon connection.
    async def connect(self, websocket: WebSocket, username: str) -> None:
        await websocket.accept()
        self.active_connections[username] = websocket

    def disconnect(self, websocket: WebSocket) -> None:
        username = next(
            (name for name, ws in self.active_connections.items() if ws is websocket),
            None,
        )
        if username is not None:
            del self.active_connections[username]

    async def broadcast(self, payload: dict[str, Any], session: Session) -> None:
        if not self.active_connections:
            print("There are no active websocket connections")
            return

        delivered_usernames: list[str] = []
        for username, connection in self.active_connections.items():
            await connection.send_json(payload)
            delivered_usernames.append(username)

        message_id_raw = payload.get("message_id")
        if not message_id_raw or not delivered_usernames:
            return

        message_id = _parse_message_id(message_id_raw)
        recipients = session.exec(
            select(User).where(col(User.username).in_(delivered_usernames))
        ).all()
        recipient_ids = [user.id for user in recipients]
        if not recipient_ids:
            return

        now = datetime.now(tz=UTC)
        deliveries = session.exec(
            select(MessageDelivery).where(
                MessageDelivery.message_id == message_id,
                col(MessageDelivery.recipient_id).in_(recipient_ids),
                col(MessageDelivery.delivered_at).is_(None),
            )
        ).all()

        for delivery in deliveries:
            delivery.delivered_at = now
            session.add(delivery)

        if deliveries:
            session.commit()


manager = ConnectionManager()


@router.websocket("/")
async def websocket_endpoint(
    websocket: WebSocket,
    user: Annotated[str, Query()],
    session: SessionDep,
) -> None:
    print("Attempting to upgrade HTTP protocol to WS.")
    await manager.connect(websocket, user)

    try:
        while True:
            payload = await websocket.receive_json()
            payload["sent_at"] = datetime.now(tz=UTC).isoformat()
            persist_message(payload, session)
            await manager.broadcast(payload, session)
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@router.post("/users", response_model=User)
async def create_user(payload: UserCreate, session: SessionDep) -> User:
    username = payload.username

    if username in manager.active_connections:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{username} already has an active connection.",
        )

    existing_user = session.exec(select(User).where(User.username == username)).first()
    if existing_user is not None:
        return existing_user

    user = User(username=username)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
