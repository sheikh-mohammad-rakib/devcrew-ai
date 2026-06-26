from fastapi import FastAPI

from devcrew_api.api.health import router as health_router

app = FastAPI(
    title="DevCrew AI API",
    description="Multi-agent software engineering team powered by Qwen Cloud.",
    version="0.1.0",
)

app.include_router(health_router)


def main() -> None:
    """Entry point for the console script."""
    import uvicorn

    uvicorn.run(
        "devcrew_api.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )