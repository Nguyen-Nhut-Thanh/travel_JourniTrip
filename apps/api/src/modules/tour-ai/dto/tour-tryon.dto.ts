import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class VirtualTryOnDto {
  @IsNotEmpty({ message: "Vui lòng cung cấp ảnh chân dung hoặc toàn thân." })
  @IsString()
  userImage!: string; // Base64 or Image URL

  @IsNotEmpty({ message: "Vui lòng chọn trang phục cần thử." })
  @IsNumber()
  costumeId!: number;

  @IsOptional()
  @IsBoolean()
  preserveBackground?: boolean;

  @IsOptional()
  @IsString()
  destinationBackdrop?: string;
}
