from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, session_id: int):
        await websocket.accept()
        if session_id not in self.connections:
            self.connections[session_id] = []
        self.connections[session_id].append(websocket)

    def disconnect(self, websocket: WebSocket, session_id: int):
        if session_id in self.connections:
            self.connections[session_id] = [
                ws for ws in self.connections[session_id] if ws != websocket
            ]

    async def broadcast(self, session_id: int, message: str):
        if session_id in self.connections:
            for ws in self.connections[session_id]:
                try:
                    await ws.send_text(message)
                except Exception:
                    pass

    async def send_to(self, websocket: WebSocket, message: str):
        try:
            await websocket.send_text(message)
        except Exception:
            pass

ws_manager = ConnectionManager()
