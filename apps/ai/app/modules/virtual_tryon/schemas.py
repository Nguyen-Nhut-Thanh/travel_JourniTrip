from pydantic import BaseModel, Field


class TryOnGenerateRequest(BaseModel):
    user_image_url: str | None = Field(default=None, description="URL of user's personal portrait/full-body photo")
    user_image_base64: str | None = Field(default=None, description="Base64 encoded string of user's photo")
    costume_id: int = Field(..., description="ID of the local costume")
    costume_name: str = Field(..., description="Name of the costume (e.g. Áo dài truyền thống, Trang phục H'mông)")
    costume_image_url: str | None = Field(default=None, description="Reference image URL for the costume")
    costume_category: str | None = Field(default=None, description="Category of costume")
    costume_keywords: str | None = Field(default=None, description="Detailed prompt keywords describing patterns and fabric")
    gender: str | None = Field(default="unisex", description="Gender styling: male, female, unisex")
    destination_backdrop: str | None = Field(default=None, description="Scenic background if user wants landmark backdrop")
    preserve_background: bool = Field(default=True, description="Whether to keep the user's photo original background")


class TryOnGenerateResponse(BaseModel):
    success: bool = True
    result_image_url: str
    costume_id: int
    message: str = "Tạo ảnh thử đồ thành công!"
