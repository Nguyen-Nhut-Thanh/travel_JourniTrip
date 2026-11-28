import { uploadValidatedImage } from "@/lib/http/uploadApi";

// Content images have their own upload routes and never use the avatar resize preset.
export const CONTENT_IMAGE_ENDPOINTS = {
  tour: "/admin/tours/upload-image",
  voucher: "/admin/marketing/vouchers/upload-image",
  location: "/admin/locations/upload",
  schedule: "/admin/tours/upload-schedule-image",
  post: "/admin/posts/upload-image",
  banner: "/banners/admin/upload",
} as const;

export type ContentImageResource = keyof typeof CONTENT_IMAGE_ENDPOINTS;

/** Upload the selected file directly without client-side resizing or recompression. */
export function uploadContentImage(
  resource: ContentImageResource,
  file: File,
  fallbackMessage = "Không thể tải ảnh lên.",
) {
  return uploadValidatedImage(CONTENT_IMAGE_ENDPOINTS[resource], file, fallbackMessage);
}
