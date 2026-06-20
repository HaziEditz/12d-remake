// Object Storage Service - stub implementation
// AWS S3 integration is disabled; configure S3_* env vars to enable file uploads
import { Response } from "express";
import { randomUUID } from "crypto";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getBucket(): string {
    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      throw new Error("S3_BUCKET not configured");
    }
    return bucket;
  }

  async downloadObject(objectKey: string, res: Response, _cacheTtlSec: number = 3600) {
    res.status(503).json({ error: "File storage not configured" });
  }

  async getObjectEntityUploadURL(): Promise<{ uploadURL: string; objectPath: string }> {
    throw new Error("File storage not configured. Set S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY.");
  }

  async getObjectKey(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }
    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }
    return parts.slice(1).join("/");
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("/objects/")) {
      return rawPath;
    }
    if (rawPath.startsWith("uploads/")) {
      return `/objects/${rawPath}`;
    }
    try {
      const url = new URL(rawPath);
      const pathParts = url.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 1) {
        const objectKey = pathParts.join("/");
        return `/objects/${objectKey}`;
      }
    } catch {
      // Not a URL, return as-is
    }
    return rawPath;
  }
}
