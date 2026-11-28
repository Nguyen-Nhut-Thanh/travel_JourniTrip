import { uploadContentImage } from "@/lib/http/contentImageUpload";

export async function uploadFeaturedLocationImage(file: File): Promise<string> {
  const result = await uploadContentImage(
    "location",
    file,
    "Không tải được ảnh, vui lòng thử lại.",
  );
  return result.url;
}
