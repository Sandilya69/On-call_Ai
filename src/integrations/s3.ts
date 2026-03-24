// ============================================
// OnCall Maestro — S3 Storage (PRD 7.8)
// ============================================
// Upload and manage handover audio files in S3/R2.
// Falls back to local storage when not configured.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { logger } from "../utils/logger.js";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const log = logger.child({ component: "s3-storage" });

// ── S3 Client ───────────────────────────────────

function createS3Client(): S3Client | null {
  const accessKeyId = process.env["AWS_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["AWS_SECRET_ACCESS_KEY"];
  const region = process.env["AWS_REGION"] || "us-east-1";
  const endpoint = process.env["STORAGE_BUCKET_URL"]; // For R2/MinIO compatibility

  if (!accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
  });
}

const BUCKET_NAME = process.env["S3_BUCKET_NAME"] || "oncall-maestro-audio";

// ── Upload Operations ───────────────────────────

/**
 * Upload an audio file to S3.
 * Returns the S3 key (path) of the uploaded file.
 */
export async function uploadAudio(
  audioBuffer: Buffer,
  metadata: {
    handoverId: string;
    teamId: string;
    filename?: string;
  }
): Promise<{ key: string; url: string } | null> {
  const client = createS3Client();

  const fileId = crypto.randomUUID();
  const key = `handovers/${metadata.teamId}/${metadata.handoverId}/${metadata.filename || `briefing-${fileId}.mp3`}`;

  if (!client) {
    // Fallback: save locally
    return saveLocally(audioBuffer, key);
  }

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: audioBuffer,
        ContentType: "audio/mpeg",
        Metadata: {
          handoverId: metadata.handoverId,
          teamId: metadata.teamId,
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    const url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;
    log.info({ key, size: audioBuffer.length }, "Audio uploaded to S3");
    return { key, url };
  } catch (err) {
    log.error({ err, key }, "S3 upload failed — falling back to local storage");
    return saveLocally(audioBuffer, key);
  }
}

/**
 * Download an audio file from S3.
 */
export async function downloadAudio(key: string): Promise<Buffer | null> {
  const client = createS3Client();

  if (!client) {
    return loadLocally(key);
  }

  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );

    if (response.Body) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    }
    return null;
  } catch (err) {
    log.error({ err, key }, "S3 download failed — trying local");
    return loadLocally(key);
  }
}

/**
 * Delete an audio file from S3.
 */
export async function deleteAudio(key: string): Promise<boolean> {
  const client = createS3Client();

  if (!client) {
    return deleteLocally(key);
  }

  try {
    await client.send(
      new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );
    log.info({ key }, "Audio deleted from S3");
    return true;
  } catch (err) {
    log.error({ err, key }, "S3 delete failed");
    return false;
  }
}

/**
 * Check if an audio file exists in S3.
 */
export async function audioExists(key: string): Promise<boolean> {
  const client = createS3Client();

  if (!client) {
    const localPath = path.resolve("storage", key);
    return fs.existsSync(localPath);
  }

  try {
    await client.send(
      new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key })
    );
    return true;
  } catch {
    return false;
  }
}

// ── Local Storage Fallback ──────────────────────

function saveLocally(
  buffer: Buffer,
  key: string
): { key: string; url: string } {
  const localPath = path.resolve("storage", key);
  const dir = path.dirname(localPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(localPath, buffer);
  log.info({ path: localPath, size: buffer.length }, "Audio saved locally (S3 not configured)");
  return { key, url: `file://${localPath}` };
}

function loadLocally(key: string): Buffer | null {
  const localPath = path.resolve("storage", key);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath);
  }
  return null;
}

function deleteLocally(key: string): boolean {
  const localPath = path.resolve("storage", key);
  if (fs.existsSync(localPath)) {
    fs.unlinkSync(localPath);
    return true;
  }
  return false;
}
