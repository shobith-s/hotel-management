from __future__ import annotations

import json
from typing import List

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        self._active: List[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self._active.remove(ws)

    async def broadcast(self, message: dict) -> None:
        data = json.dumps(message)
        for ws in list(self._active):
            try:
                await ws.send_text(data)
            except Exception:
                self._active.discard(ws) if hasattr(self._active, 'discard') else None


kds_manager = ConnectionManager()
