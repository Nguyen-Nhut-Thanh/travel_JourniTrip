import logging
from fastapi import APIRouter, HTTPException

from app.modules.virtual_tryon.schemas import TryOnGenerateRequest, TryOnGenerateResponse
from app.modules.virtual_tryon.tryon_service import process_virtual_tryon

router = APIRouter(prefix="/try-on", tags=["Virtual Try-On AI"])
logger = logging.getLogger(__name__)


@router.post('/generate', response_model=TryOnGenerateResponse)
async def generate_virtual_tryon_endpoint(request: TryOnGenerateRequest) -> TryOnGenerateResponse:
    try:
        return await process_virtual_tryon(request)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        logger.exception("Virtual Try-On generation failed: %s", e)
        raise HTTPException(500, f"Không thể xử lý thử đồ lúc này: {str(e)}")
