import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

function config() {
  const bucket = process.env.S3_BUCKET || process.env.AVATAR_S3_BUCKET;
  if (!bucket) throw new Error("Avatar storage is not configured (S3_BUCKET).");
  const region = process.env.S3_REGION || process.env.AVATAR_S3_REGION || "auto";
  const client = new S3Client({
    region,
    endpoint: process.env.S3_ENDPOINT || process.env.AVATAR_S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT || process.env.AVATAR_S3_ENDPOINT),
    credentials: process.env.S3_ACCESS_KEY_ID || process.env.AVATAR_S3_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || process.env.AVATAR_S3_ACCESS_KEY_ID!,
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || process.env.AVATAR_S3_SECRET_ACCESS_KEY!,
        }
      : undefined,
  });
  return { client, bucket, prefix: (process.env.S3_AVATAR_PREFIX || "avatars/").replace(/^\/+|\/*$/g, "") + "/" };
}

export function avatarObjectKeyFromUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const prefix = (process.env.S3_AVATAR_PREFIX || "avatars/").replace(/^\/+|\/*$/g, "") + "/";
  try {
    const url = new URL(value);
    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const marker = path.indexOf(prefix);
    const key = marker >= 0 ? path.slice(marker) : path;
    return key.startsWith(prefix) ? key : null;
  } catch {
    return null;
  }
}

export async function storeAvatarBytes(userId: string, bytes: Uint8Array, contentType: string): Promise<{ key: string; url: string }> {
  const { client, bucket, prefix } = config();
  const base = (process.env.S3_PUBLIC_BASE_URL || process.env.AVATAR_S3_PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (!base) throw new Error("Avatar storage is missing S3_PUBLIC_BASE_URL.");
  const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const key = `${prefix}${userId}/${crypto.randomUUID()}.${ext}`;
  await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: Buffer.from(bytes), ContentType: contentType, CacheControl: "public, max-age=31536000, immutable" }));
  return { key, url: `${base}/${key.split("/").map(encodeURIComponent).join("/")}` };
}

export async function uploadAvatar(userId: string, file: File) {
  return storeAvatarBytes(userId, new Uint8Array(await file.arrayBuffer()), file.type);
}

export async function deleteAvatarKey(key: string) {
  const { client, bucket, prefix } = config();
  if (!key.startsWith(prefix)) return;
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export async function readAvatar(key: string): Promise<{ contentType: string; bytes: Buffer }> {
  const { client, bucket, prefix } = config();
  if (!key.startsWith(prefix)) throw new Error("Invalid avatar object key.");
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!response.Body) throw new Error("Avatar image was not found in storage.");
  return { contentType: response.ContentType || "application/octet-stream", bytes: Buffer.from(await response.Body.transformToByteArray()) };
}
