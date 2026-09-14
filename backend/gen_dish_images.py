"""Génération (une fois) des photos de plats avec Gemini Nano Banana via la clé universelle Emergent.
Usage : python gen_dish_images.py [--only key1,key2] [--force]
"""
import asyncio
import base64
import io
import os
import sys
import time

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
sys.path.insert(0, os.path.dirname(__file__))

from PIL import Image  # noqa: E402
from emergentintegrations.llm.chat import LlmChat, UserMessage  # noqa: E402
from dish_images import all_jobs, DISH_DIR  # noqa: E402

API_KEY = os.getenv("EMERGENT_LLM_KEY")
MODEL = "gemini-3.1-flash-image-preview"
CONCURRENCY = 3


async def gen_one(key: str, prompt: str, sem: asyncio.Semaphore) -> bool:
    out = os.path.join(DISH_DIR, f"{key}.jpg")
    async with sem:
        for attempt in range(3):
            try:
                chat = LlmChat(api_key=API_KEY, session_id=f"dish-{key}-{attempt}", system_message="You generate realistic food photographs.")
                chat.with_model("gemini", MODEL).with_params(modalities=["image", "text"])
                _, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
                if not images:
                    raise RuntimeError("no image returned")
                raw = base64.b64decode(images[0]["data"])
                im = Image.open(io.BytesIO(raw)).convert("RGB")
                im.thumbnail((900, 900))
                im.save(out, "JPEG", quality=82, optimize=True)
                print(f"OK  {key}", flush=True)
                return True
            except Exception as e:  # noqa: BLE001
                print(f"ERR {key} (essai {attempt + 1}) : {str(e)[:120]}", flush=True)
                await asyncio.sleep(3 + attempt * 5)
    return False


async def main():
    os.makedirs(DISH_DIR, exist_ok=True)
    force = "--force" in sys.argv
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    jobs = [(k, p) for k, p in all_jobs() if (only is None or k in only) and (force or not os.path.exists(os.path.join(DISH_DIR, f"{k}.jpg")))]
    print(f"{len(jobs)} image(s) à générer", flush=True)
    sem = asyncio.Semaphore(CONCURRENCY)
    t0 = time.time()
    res = await asyncio.gather(*(gen_one(k, p, sem) for k, p in jobs))
    print(f"Terminé : {sum(res)}/{len(jobs)} en {int(time.time() - t0)} s", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
