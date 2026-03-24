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


router: APIRouter = APIRouter(prefix="/jobs", tags=["jobs"])


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
    session: SessionDep,
    job_id: str,
    last_event_id: int | None = None,
) -> AsyncIterable[ServerSentEvent]:

    print(f"sse_job called with job_id={job_id}")
    stmt = select(Job).where(Job.id == job_id)
    job: Optional[Job] = session.exec(stmt).first()
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # Update and persist the job status
    job.status = JobStatus.RUNNING
    session.add(job)
    session.commit()
    session.refresh(job)

    word_count = job.payload["word_count"]
    print(f"word_count for job {job_id}: {word_count}")

    for i in range(0 if not last_event_id else int(last_event_id), word_count, 1):
        is_final_event: bool = i == word_count - 1
        event_type = "terminate" if is_final_event else "message"
        if is_final_event:
            job.status = JobStatus.COMPLETED
            session.add(job)
            session.commit()
            session.refresh(job)
        yield ServerSentEvent(
            data=get_random_word(),
            event=event_type,
            id=str(i + 1),
            retry=10000,
        )
        await asyncio.sleep(0.2)
