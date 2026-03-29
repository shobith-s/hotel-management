from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.ws_manager import kds_manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/kds")
async def kds_websocket(websocket: WebSocket) -> None:
    await kds_manager.connect(websocket)
    try:
        while True:
            # Keep the connection alive; client may send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        kds_manager.disconnect(websocket)
