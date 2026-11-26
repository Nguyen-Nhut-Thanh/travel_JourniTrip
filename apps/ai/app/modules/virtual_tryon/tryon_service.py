import base64
import logging
import httpx

from app.clients.openai_client import call_image_tryon_edit
from app.modules.virtual_tryon.prompts import build_tryon_prompt
from app.modules.virtual_tryon.schemas import TryOnGenerateRequest, TryOnGenerateResponse

logger = logging.getLogger(__name__)


async def fetch_image_bytes(image_url: str | None, image_base64: str | None, default_mime: str = "image/jpeg") -> tuple[bytes | None, str]:
    if image_base64:
        header_data = image_base64
        mime_type = default_mime
        if "base64," in header_data:
            header, header_data = header_data.split("base64,", 1)
            if "image/png" in header:
                mime_type = "image/png"
            elif "image/webp" in header:
                mime_type = "image/webp"
            elif "image/jpeg" in header or "image/jpg" in header:
                mime_type = "image/jpeg"
        return base64.b64decode(header_data), mime_type

    if image_url:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(image_url)
            res.raise_for_status()
            content_type = res.headers.get("content-type", default_mime)
            mime_type = content_type.split(";")[0] if content_type.startswith("image/") else default_mime
            return res.content, mime_type

    return None, default_mime


async def process_virtual_tryon(request: TryOnGenerateRequest) -> TryOnGenerateResponse:
    """
    Orchestrates the virtual try-on workflow:
    1. Extracts and prepares user image.
    2. Builds a precision prompt preserving identity and rendering the costume.
    3. Calls OpenAI Image API (gpt-image-2.6-sunburst).
    4. Returns the generated image URL or base64.
    """
    # 1. Obtain user image bytes
    user_bytes, user_mime = await fetch_image_bytes(request.user_image_url, request.user_image_base64)
    if not user_bytes:
        raise ValueError("Vui lòng tải lên ảnh cá nhân (user_image_url hoặc user_image_base64) để thử đồ.")

    # 2. Optionally obtain costume reference image bytes
    costume_bytes, costume_mime = None, "image/jpeg"
    if request.costume_image_url:
        try:
            costume_bytes, costume_mime = await fetch_image_bytes(request.costume_image_url, None)
        except Exception as e:
            logger.warning("Could not download costume reference image: %s", e)

    # 3. Build detailed prompt
    prompt = build_tryon_prompt(
        costume_name=request.costume_name,
        costume_keywords=request.costume_keywords,
        gender=request.gender,
        destination_backdrop=request.destination_backdrop,
        preserve_background=request.preserve_background
    )

    logger.info("Executing Virtual Try-On for costume_id=%d, name='%s' with prompt length=%d",
                request.costume_id, request.costume_name, len(prompt))

    # 4. Invoke model
    result_url = await call_image_tryon_edit(
        prompt=prompt,
        user_image_bytes=user_bytes,
        user_image_mime=user_mime,
        costume_image_bytes=costume_bytes,
        costume_image_mime=costume_mime,
        timeout=60.0
    )

    return TryOnGenerateResponse(
        success=True,
        result_image_url=result_url,
        costume_id=request.costume_id,
        message=f"Thử đồ '{request.costume_name}' thành công!"
    )
