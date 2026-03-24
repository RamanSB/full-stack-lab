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


# TODO: Send a completion signal when the stream has completed to prevent onError
# event on frontend.
@router.get("/{job_id}", response_class=EventSourceResponse)
async def sse_job(
    session: SessionDep, job_id: str, word_count: int = 100
) -> AsyncIterable[ServerSentEvent]:

    print(f"sse_job called with job_id={job_id}, word_count={word_count}")
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
