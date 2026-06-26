from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI

from devcrew_api.api.router import api_router
from devcrew_api.core.config import get_settings
from devcrew_api.core.logging import configure_logging

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Multi-agent software engineering team powered by Qwen Cloud.",
    lifespan=lifespan,
)

app.include_router(api_router)


def main() -> None:
    uvicorn.run(
        "devcrew_api.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )