from enum import Enum


class JobType(Enum):
    TEXT_STREAM_DEMO = "TEXT_STREAM_DEMO"


class JobStatus(Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
