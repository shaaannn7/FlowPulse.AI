"""
File: main.py
Purpose: FastAPI Application Entrypoint.
Why it exists: Bootstraps the HTTP and WebSocket routing channels, handles Lifespan database setups, and registers global middlewares and exception interceptors.
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.core.websockets.manager import manager
from app.db.session import engine, Base, SessionLocal
from app.db.repository import DBRepository
from app.core.registry import active_processors
from app.core.ai.pipeline import StreamProcessor
from app.core.optimization.controller import traffic_controller
from contextlib import asynccontextmanager
import asyncio
import logging
import time

# Configure Logger format
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    logger.info("Starting FlowPulse AI Gateway initialization...")
    logger.info("Initializing database schemas...")
    Base.metadata.create_all(bind=engine)

    # Seed default junction data if empty
    db = SessionLocal()
    try:
        junctions = DBRepository.get_junctions(db)
        if not junctions:
            DBRepository.create_junction(
                db=db,
                name="Junction Central (Broadway & 42nd St)",
                latitude=40.758896,
                longitude=-73.985130
            )
            logger.info("Database seeded with default central junction Broadway & 42nd St.")
    except Exception as e:
        logger.error(f"Error seeding database junction: {str(e)}")
    finally:
        db.close()

    # Start default simulated stream
    logger.info("Starting default camera stream processors...")
    processor = StreamProcessor(camera_id="cam_north_01", source="simulated")
    active_processors["cam_north_01"] = processor
    processor.start()

    # Start background WebSocket broadcast queue consumer
    broadcast_task = asyncio.create_task(manager.run_broadcast_loop())

    # Start periodic signal ticking loop
    async def signal_tick_loop():
        try:
            while True:
                await asyncio.sleep(1.0)
                traffic_controller.tick()
                # Broadcast signal updates to all connected WS clients
                update_event = {
                    "event": "signal:change",
                    "timestamp": time.time(),
                    "data": traffic_controller.get_status()
                }
                await manager.broadcast(update_event)
        except asyncio.CancelledError:
            pass

    tick_task = asyncio.create_task(signal_tick_loop())
    
    yield
    
    # Shutdown actions
    logger.info("Shutting down FlowPulse AI Gateway...")
    
    logger.info("Stopping active stream processors...")
    for pid, proc in list(active_processors.items()):
        proc.stop()
        del active_processors[pid]

    logger.info("Stopping signal tick loop and broadcast loop...")
    tick_task.cancel()
    broadcast_task.cancel()
    try:
        await asyncio.gather(tick_task, broadcast_task, return_exceptions=True)
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API and Real-Time WebSocket server for FlowPulse AI traffic control.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Global Exception Interceptors ---

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTP Exception encountered: {exc.detail} (Status: {exc.status_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation Exception encountered: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"success": False, "detail": exc.errors()}
    )

# --- Root & Health checks ---

@app.get("/")
def read_root():
    return {"message": "Welcome to FlowPulse AI Backend API"}

@app.get(f"{settings.API_V1_STR}/health")
def health_check():
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "version": "1.0.0"
    }

# --- Router Registration ---
from app.api.v1.router import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)

# --- WebSocket Gateway Route ---

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    logger.info(f"Client {client_id} connected to WebSockets")
    try:
        while True:
            data = await websocket.receive_json()
            # Handle client commands pushed via Websockets
            if isinstance(data, dict) and data.get("action") == "override":
                phase = data.get("phase", "NORTH_SOUTH")
                traffic_controller.force_override(phase)
                # Instantly broadcast update
                await manager.broadcast({
                    "event": "signal:change",
                    "timestamp": time.time(),
                    "data": traffic_controller.get_status()
                })
            elif isinstance(data, dict) and data.get("action") == "resume":
                traffic_controller.resume_auto()
                # Instantly broadcast update
                await manager.broadcast({
                    "event": "signal:change",
                    "timestamp": time.time(),
                    "data": traffic_controller.get_status()
                })
            else:
                await websocket.send_json({"echo": data, "status": "received"})
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
        logger.info(f"Client {client_id} disconnected from WebSockets")
    except Exception as e:
        logger.error(f"WebSocket error on client {client_id}: {str(e)}")
        manager.disconnect(websocket, client_id)
