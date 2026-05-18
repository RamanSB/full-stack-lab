from fastapi import APIRouter

from backend.app.api.routers.jobs import router as jobs_router
from backend.app.api.routers.websockets import router as websockets_router


api_router = APIRouter()
api_router.include_router(jobs_router)
api_router.include_router(websockets_router)
