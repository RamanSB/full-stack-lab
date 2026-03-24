from typing import AsyncIterable, Optional, Tuple
from fastapi import APIRouter
from fastapi.sse import EventSourceResponse, ServerSentEvent
from sqlmodel import Session, select
from fastapi import HTTPException

from backend.app.core.utils import get_random_word
from backend.app.enums import JobStatus
from backend.app.schemas.job import JobCreate
from backend.app.deps import SessionDep
from backend.app.models import Job
import asyncio


router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/")
async def get_event_details():
    pass


@router.post("/", response_model=Job)
def create_job(session: SessionDep, job_create: JobCreate):
    job = Job(**job_create.model_dump(), status=JobStatus.PENDING)
    db_obj = Job.model_validate(job)
    session.add(db_obj)
    session.commit()
    session.refresh(db_obj)
    return db_obj


@router.get("/{job_id}", response_class=EventSourceResponse)
async def sse_job(
    session: SessionDep, job_id: str, word_count: int = 100
) -> AsyncIterable[ServerSentEvent]:

    stmt = select(Job).where(Job.id == job_id)
    job: Optional[Job] = session.exec(stmt).first()

    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # Update and persist the job status
    job.status = JobStatus.RUNNING
    session.add(job)
    session.commit()
    session.refresh(job)

    for i in range(word_count):
        yield ServerSentEvent(
            data=get_random_word(), event="message", id=str(i + 1), retry=10000
        )
        await asyncio.sleep(0.2)
