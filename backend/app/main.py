from contextlib import asynccontextmanager
from multiprocessing import allow_connection_pickling
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware import Middleware
from pydantic import config

from backend.app.api.main import api_router
from backend.app.core.db import create_db_tables


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_tables()
    yield


CORS_WHITELISTED_ORIGINS = ["http://localhost:5173"]


app = FastAPI(title="Playground", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_WHITELISTED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router=api_router)
