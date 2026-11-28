"use client";

import { ImageUpload } from "@/components/common/form_controls/ImageUpload";
import { CONTENT_IMAGE_ENDPOINTS, type ContentImageResource } from "@/lib/http/contentImageUpload";
import type { ImageUploadProps } from "shared";

export type ContentImageUploadProps = Omit<ImageUploadProps, "endpoint"> & {
  resource: ContentImageResource;
};

/** Upload tour and other content images through their original-resolution routes. */
export function ContentImageUpload({ resource, ...props }: ContentImageUploadProps) {
  return <ImageUpload {...props} endpoint={CONTENT_IMAGE_ENDPOINTS[resource]} />;
}
