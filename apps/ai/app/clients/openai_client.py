import logging
from functools import lru_cache
import httpx

from fastapi import HTTPException
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import settings

logger = logging.getLogger(__name__)


class OpenAIInvocationError(Exception):
    def __init__(self, status_code: int | None):
        self.status_code = status_code
        super().__init__('OpenAI generation failed')


def api_key() -> str:
    key = settings.OPENAI_API_KEY.get_secret_value().strip()
    if not key:
        raise HTTPException(503, "Chưa cấu hình OPENAI_API_KEY cho trợ lý tư vấn.")
    return key


async def call_chat_completion(messages: list[dict], timeout: float = 22.0) -> str:
    url = f"{settings.OPENAI_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key()}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": settings.AI_CHAT_MODEL,
        "messages": messages,
    }
    if settings.AI_CHAT_MODEL != 'gpt-6-luna':
        payload["temperature"] = 0.2

    async with httpx.AsyncClient(timeout=timeout) as client:
        res = await client.post(url, headers=headers, json=payload)
        res.raise_for_status()
        data = res.json()
        return data["choices"][0]["message"]["content"].strip()


@lru_cache(maxsize=1)
def chat_model():
    model = settings.AI_CHAT_MODEL
    options = {} if model == 'gpt-6-luna' else {'temperature': 0.2}
    return ChatOpenAI(model=model, api_key=api_key(), base_url=settings.OPENAI_BASE_URL,
                      use_responses_api=False, timeout=30, max_retries=0, **options)


@lru_cache(maxsize=1)
def embedding_model():
    return OpenAIEmbeddings(model=settings.AI_EMBEDDING_MODEL, api_key=api_key(),
                            base_url=settings.OPENAI_BASE_URL, request_timeout=12,
                            max_retries=0, check_embedding_ctx_length=False)


async def call_image_tryon_edit(
    prompt: str,
    user_image_bytes: bytes | None = None,
    user_image_mime: str = "image/jpeg",
    costume_image_bytes: bytes | None = None,
    costume_image_mime: str = "image/jpeg",
    timeout: float = 60.0
) -> str:
    """
    Call OpenAI Image API using model (e.g. gpt-image-2.6-sunburst).
    First attempts /images/edits multipart request if user_image_bytes is provided.
    Falls back to /images/generations if edits is not supported or fails.
    """
    headers = {
        "Authorization": f"Bearer {api_key()}",
    }

    if user_image_bytes:
        url_edits = f"{settings.OPENAI_BASE_URL}/images/edits"
        files = {
            "image": ("user_photo.jpg", user_image_bytes, user_image_mime),
        }
        data = {
            "model": settings.AI_TRYON_MODEL,
            "prompt": prompt,
            "n": "1",
            "size": "1024x1024",
        }
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(url_edits, headers=headers, data=data, files=files)
                if res.status_code == 200:
                    resp_json = res.json()
                    item = resp_json.get("data", [{}])[0]
                    if item.get("url"):
                        return item["url"]
                    if item.get("b64_json"):
                        return f"data:image/png;base64,{item['b64_json']}"
                else:
                    logger.warning("Call to /images/edits returned HTTP %s: %s", res.status_code, res.text)
        except Exception as e:
            logger.warning("Call to /images/edits failed: %s. Trying /images/generations fallback.", e)

    # Fallback to /images/generations
    url_gen = f"{settings.OPENAI_BASE_URL}/images/generations"
    headers["Content-Type"] = "application/json"
    json_payload = {
        "model": settings.AI_TRYON_MODEL,
        "prompt": prompt,
        "n": 1,
        "size": "1024x1024",
    }
    async with httpx.AsyncClient(timeout=timeout) as client:
        res = await client.post(url_gen, headers=headers, json=json_payload)
        res.raise_for_status()
        resp_json = res.json()
        item = resp_json.get("data", [{}])[0]
        if item.get("url"):
            return item["url"]
        if item.get("b64_json"):
            return f"data:image/png;base64,{item['b64_json']}"
        raise OpenAIInvocationError(res.status_code)


