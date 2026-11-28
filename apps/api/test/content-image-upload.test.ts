import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { BadRequestException } from "@nestjs/common";
import { GUARDS_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { uploadToFolder } from "../src/common/decorators/use-folder-upload";
import type { CloudinaryService } from "../src/infrastructure/storage/cloudinary.service";
import { AdminAuthGuard } from "../src/modules/auth/admin.guard";
import { BannersService } from "../src/modules/banners/banners.service";
import { LocationsAdminController } from "../src/modules/locations/locations-admin.controller";
import { PostsAdminController } from "../src/modules/posts/posts-admin.controller";
import { SchedulesAdminController } from "../src/modules/schedules/schedules-admin.controller";
import { ToursAdminController } from "../src/modules/tours/tours-admin.controller";
import { VouchersAdminController } from "../src/modules/vouchers/vouchers-admin.controller";

test("content upload routes preserve a large original image without avatar resizing", async () => {
  const original = await sharp({ create: {
    width: 2400, height: 1600, channels: 3, background: "#1288aa",
  } }).png().toBuffer();
  const file = { buffer: original, size: original.length, mimetype: "image/png" } as Express.Multer.File;
  let lastFolder = "";
  const storage = { uploadBuffer: async (buffer, options) => {
    // Any resizing/re-encoding before upload or Cloudinary transformation fails this check.
    assert.equal(buffer, original);
    assert.equal(options.transformation, undefined);
    assert.equal(options.quality, undefined);
    assert.equal(options.format, undefined);
    lastFolder = options.folder as string;
    return { secure_url: `https://example.test/${lastFolder}/original.png` };
  } } as CloudinaryService;

  const routes = [
    ["tours", () => new ToursAdminController(undefined as never, storage).uploadImage(file)],
    ["vouchers", () => new VouchersAdminController(undefined as never, storage).uploadImage(file)],
    ["locations", () => new LocationsAdminController(undefined as never, storage).uploadLocationImage(file)],
    ["schedules", () => new SchedulesAdminController(undefined as never, storage).uploadScheduleImage(file)],
    ["posts", () => new PostsAdminController(undefined as never, storage).uploadImage(file)],
    ["banners", () => new BannersService(undefined as never, storage).uploadBanner(file)],
  ] as const;

  for (const [resource, upload] of routes) {
    const result = await upload();
    assert.equal(lastFolder, `JourniTrip/${resource}`);
    assert.equal(result.url, `https://example.test/JourniTrip/${resource}/original.png`);
  }
});

test("new tour and voucher upload routes require the admin guard", () => {
  for (const [controller, path] of [
    [ToursAdminController, "admin/tours/upload-image"],
    [VouchersAdminController, "admin/marketing/vouchers/upload-image"],
  ] as const) {
    assert.ok(Reflect.getMetadata(GUARDS_METADATA, controller).includes(AdminAuthGuard));
    assert.equal(Reflect.getMetadata(PATH_METADATA, controller.prototype.uploadImage), path);
  }
});

test("avatar uploads retain their own size limit", async () => {
  const storage = { uploadBuffer: async (_buffer, options) => {
    assert.equal(options.folder, "JourniTrip/avatars");
    assert.deepEqual(options.transformation, [{ width: 500, height: 500, crop: "limit" }]);
    return { secure_url: "https://example.test/avatar.png" };
  } } as CloudinaryService;
  await uploadToFolder(storage, { buffer: Buffer.from("avatar"), size: 6 } as Express.Multer.File, "JourniTrip/avatars");
});

test("an empty content upload is rejected before contacting storage", async () => {
  const storage = { uploadBuffer: async () => { assert.fail("Storage must not receive an empty upload"); } } as unknown as CloudinaryService;
  await assert.rejects(uploadToFolder(storage, undefined as never, "JourniTrip/tours"), BadRequestException);
  await assert.rejects(uploadToFolder(storage, { size: 0 } as Express.Multer.File, "JourniTrip/vouchers"), BadRequestException);
});
