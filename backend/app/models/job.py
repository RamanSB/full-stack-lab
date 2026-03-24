from typing import Dict
import uuid
from sqlmodel import Field, SQLModel
from sqlalchemy.dialects.postgresql import JSONB

from backend.app.enums import JobStatus, JobType


class Job(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    job_type: JobType = Field(nullable=False)
    status: JobStatus = Field(nullable=False)
    payload: Dict = Field(default_factory=dict, sa_type=JSONB, nullable=False)
    meta: Dict = Field(default_factory=dict, sa_type=JSONB, nullable=False)
