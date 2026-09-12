"""Emergent Object Storage — photos de plats."""
import os
import logging
import requests

logger = logging.getLogger(__name__)

STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "mon-plan-alimentaire"
_storage_key = None


def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY manquant")
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": key}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _reset():
    global _storage_key
    _storage_key = None


def put_object(path: str, data: bytes, content_type: str) -> dict:
    for attempt in range(2):
        key = init_storage()
        resp = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key, "Content-Type": content_type}, data=data, timeout=120)
        if resp.status_code == 503 and attempt == 0:
            _reset()
            continue
        if resp.status_code == 402:
            raise PermissionError("Crédits de stockage épuisés : ajout de photo impossible pour le moment.")
        resp.raise_for_status()
        return resp.json()
    raise RuntimeError("Stockage indisponible")


def get_object(path: str):
    for attempt in range(2):
        key = init_storage()
        resp = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
        if resp.status_code == 503 and attempt == 0:
            _reset()
            continue
        resp.raise_for_status()
        return resp.content, resp.headers.get("Content-Type", "application/octet-stream")
    raise RuntimeError("Stockage indisponible")
