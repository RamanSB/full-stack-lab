from typing import Dict, Optional
from pydantic import BaseModel

from backend.app.enums import JobType


class JobCreate(BaseModel):
    job_type: JobType
    payload: Optional[Dict] = {}
    meta: Optional[Dict] = {}
