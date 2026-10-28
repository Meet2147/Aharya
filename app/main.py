from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.routers import assessments


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Aharya",
    description="Lab reports in, a personalised Indian meal plan and grocery list out.",
    version="0.1.0",
    lifespan=lifespan,
)
# The Expo web build calls the API from another origin; no cookies are used, so any origin is fine.
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(assessments.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "llm": "claude" if settings.use_llm else "offline"}
