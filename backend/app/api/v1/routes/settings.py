import json
from pathlib import Path

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.security import get_current_user, require_roles
from app.models.enums import UserRole

router = APIRouter(prefix="/settings", tags=["Settings"])

_SETTINGS_FILE = Path(__file__).resolve().parents[4] / "data" / "hotel_settings.json"


class HotelSettings(BaseModel):
    name: str = "Hotel"
    address: str = ""
    phone: str = ""
    gstin: str = ""
    upi_id: str = ""
    logo_url: str = ""
    service_charge_pct: float = 10.0
    default_checkout_time: str = "12:00"


def load_settings() -> HotelSettings:
    if _SETTINGS_FILE.exists():
        data = json.loads(_SETTINGS_FILE.read_text())
        return HotelSettings(**data)
    return HotelSettings()


def _save_settings(s: HotelSettings) -> None:
    _SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    _SETTINGS_FILE.write_text(json.dumps(s.model_dump(), indent=2))


@router.get("", response_model=HotelSettings)
def get_settings(_=Depends(get_current_user)):
    return load_settings()


@router.put("", response_model=HotelSettings, dependencies=[Depends(require_roles(UserRole.admin))])
def update_settings(data: HotelSettings):
    _save_settings(data)
    return data
