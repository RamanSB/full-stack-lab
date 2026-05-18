from datetime import datetime
import uuid
from sqlalchemy import TIMESTAMP
from sqlmodel import Field, SQLModel


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    username: str = Field(unique=True, nullable=False)


class Message(SQLModel, table=True):
    __tablename__ = "messages"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    sender_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    content: str = Field()
    sent_at: datetime = Field(nullable=False, sa_type=TIMESTAMP(timezone=True))


class MessageDelivery(SQLModel, table=True):
    __tablename__ = "message_deliveries"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    message_id: uuid.UUID = Field(foreign_key="messages.id", nullable=False)
    recipient_id: uuid.UUID = Field(foreign_key="users.id", nullable=False)
    delivered_at: datetime = Field(nullable=False, sa_type=TIMESTAMP(timezone=True))
