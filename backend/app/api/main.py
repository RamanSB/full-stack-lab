from fastapi import APIRouter

from backend.app.api.routers.jobs import router as jobs_router


api_router = APIRouter()
api_router.include_router(jobs_router)
