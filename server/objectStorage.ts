// Object Storage Service for file uploads
// Uses AWS S3 or S3-compatible storage (works with Render, AWS, Cloudflare R2, etc.)
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Response } from "express";
import { randomUUID } from "crypto";

const S3_BUCKET = process.env.S3_BUCKET || "";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "";
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "";
const S3_ENDPOINT = process.env.S3_ENDPOINT || undefined;

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
      throw new Error(
        "S3 credentials not configured. Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables."
      );
    }

    s3Client = new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      ...(S3_ENDPOINT && { endpoint: S3_ENDPOINT }),
    });
  }
  return s3Client;
}

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
    if (!S3_BUCKET) {
      throw new Error(
        "S3_BUCKET not set. Configure S3_BUCKET environment variable with your bucket name."
      );
    }
    return S3_BUCKET;
  }

  async downloadObject(objectKey: string, res: Response, cacheTtlSec: number = 3600) {
    try {
      const client = getS3Client();
      const bucket = this.getBucket();

      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      });

      const response = await client.send(command);

      res.set({
        "Content-Type": response.ContentType || "application/octet-stream",
        "Content-Length": response.ContentLength?.toString() || "",
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      if (response.Body) {
        const bodyContents = await response.Body.transformToByteArray();
        res.send(Buffer.from(bodyContents));
      } else {
        res.status(500).json({ error: "Error streaming file" });
      }
    } catch (error: any) {
      console.error("Error downloading file:", error);
      if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
        throw new ObjectNotFoundError();
      }
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async getObjectEntityUploadURL(): Promise<{ uploadURL: string; objectPath: string }> {
    const bucket = this.getBucket();
    const client = getS3Client();

    const objectId = randomUUID();
    const objectKey = `uploads/${objectId}`;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });

    const signedUrl = await getSignedUrl(client, command, { expiresIn: 900 });
    return {
      uploadURL: signedUrl,
      objectPath: `/objects/${objectKey}`,
    };
  }

  async getObjectKey(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const objectKey = parts.slice(1).join("/");

    const client = getS3Client();
    const bucket = this.getBucket();

    try {
      const command = new HeadObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      });
      await client.send(command);
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        throw new ObjectNotFoundError();
      }
      throw error;
    }

    return objectKey;
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
