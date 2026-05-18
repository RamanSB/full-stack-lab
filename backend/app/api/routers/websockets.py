from datetime import UTC, datetime

from typing import Annotated, Any, Dict, List
from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status,
)
from sqlmodel import select
from pydantic import BaseModel, WebsocketUrl
from datetime import datetime

from backend.app.deps import SessionDep
from backend.app.models import Message, User


router: APIRouter = APIRouter(prefix="/ws", tags=["websockets"])


class ConnectionManager:
    def __init__(self):
        # Map username (str) -> WebSocket instance
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, name: str):
        await websocket.accept()
        self.active_connections[name] = websocket

    def disconnect(self, websocket: WebSocket):
        # Remove the websocket from active_connections by value
        to_remove = None
        for name, ws in self.active_connections.items():
            if ws == websocket:
                to_remove = name
                break
        if to_remove:
            del self.active_connections[to_remove]

    async def broadcast(self, json_data: Dict):
        if not self.active_connections:
            print("There are no active websocket connections")
        for ws in self.active_connections.values():
            await ws.send_json(json_data)


manager = ConnectionManager()


@router.websocket("/")
async def websocket_endpoint(
    websocket: WebSocket, user: Annotated[str, Query()], session: SessionDep
):

    print(f"Attempting to upgrade HTTP protocol to WS.")
    await manager.connect(websocket, user)
    while True:
        try:
            json_data = await websocket.receive_json()  # Throws WebSocketDisconnect
            json_data["sent_at"] = datetime.now(tz=UTC).isoformat()
            # persist_message(json_data)
            await manager.broadcast(json_data)
        except WebSocketDisconnect as ex:
            manager.disconnect(websocket)


class UserCreate(BaseModel):
    username: str


@router.post("/users", response_model=User)
async def create_user(payload: UserCreate, session: SessionDep):
    username: str = payload.username
    stmt = select(User).where(User.username == username)
    result = session.exec(stmt).first()
    if result:
        raise HTTPException(
            detail=f"{username} has already been taken.",
            status_code=status.HTTP_409_CONFLICT,
        )

    user = User(username=username)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user
