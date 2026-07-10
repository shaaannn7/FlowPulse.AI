from typing import Dict, Set, Any
import queue
import asyncio
from fastapi import WebSocket

class ConnectionManager:
    """
    Manages active WebSocket connections for client dashboard streams and updates.
    """
    def __init__(self):
        # Maps client_id to active WebSocket instances
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.broadcast_queue = queue.Queue()

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = set()
        self.active_connections[client_id].add(websocket)

    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].discard(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]

    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, message: Dict[str, Any]):
        """
        Broadcasts a message to all connected clients across all client IDs.
        """
        for connections in list(self.active_connections.values()):
            for connection in list(connections):
                try:
                    await connection.send_json(message)
                except Exception:
                    # Clean up dead connection if encountered
                    pass

    def broadcast_sync(self, message: Dict[str, Any]):
        """
        Thread-safe sync method to queue a broadcast message from background threads.
        """
        self.broadcast_queue.put(message)

    async def run_broadcast_loop(self):
        """
        Async loop running on the main event loop to dispatch queued broadcast messages.
        Uses asyncio.to_thread to wait for items without burning CPU in a tight poll.
        """
        while True:
            try:
                message = await asyncio.to_thread(self.broadcast_queue.get)
                await self.broadcast(message)
                self.broadcast_queue.task_done()
            except Exception:
                await asyncio.sleep(1)

manager = ConnectionManager()
