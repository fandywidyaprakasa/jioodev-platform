// Cloudflare R2 adapter (S3-compatible). Stores ONLY keys in the database, never absolute URLs.
// Bucket layout: <type>/<yyyy/mm>/<uuid>/<version>/<file>
//   public:  jioo-cdn-public   (preview/thumb, public read)
//   private: jioodev-storage-private (bundles/versions/payloads, presigned access)
// Heavy SDK deps (@aws-sdk/*) are loaded lazily so non-R2 code paths/tests don't pay
// their import cost. Requires `pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`.

// Single-bucket mode (R2_BUCKET) takes precedence; two-bucket mode is used when both
// R2_BUCKET_PUBLIC and R2_BUCKET_PRIVATE are set. Public vs private separation in
// single-bucket mode is by key prefix (public/... vs everything else).
const R2_ENDPOINT = (process.env.R2_ENDPOINT ?? "").replace(/\/$/, "");
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const R2_BUCKET = process.env.R2_BUCKET ?? "";
const R2_BUCKET_PUBLIC = process.env.R2_BUCKET_PUBLIC ?? "";
const R2_BUCKET_PRIVATE = process.env.R2_BUCKET_PRIVATE ?? "";
const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

function singleBucket() {
  return Boolean(R2_BUCKET) && !R2_BUCKET_PUBLIC && !R2_BUCKET_PRIVATE;
}

function bucketFor(key: string) {
  if (singleBucket()) return R2_BUCKET;
  return isPublicKey(key) ? R2_BUCKET_PUBLIC || R2_BUCKET : R2_BUCKET_PRIVATE || R2_BUCKET;
}

function isPublicKey(key: string) {
  return key.startsWith("public/") || key.startsWith("preview/") || key.startsWith("thumb/");
}

export function r2Configured() {
  const hasBucket = Boolean(R2_BUCKET || (R2_BUCKET_PUBLIC && R2_BUCKET_PRIVATE));
  return Boolean(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && hasBucket && (R2_ENDPOINT || R2_ACCOUNT_ID));
}

function clientConfig() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error("R2 credentials missing (R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY).");
  }
  const endpoint =
    R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return {
    region: "auto",
    endpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  };
}

export function getPublicUrl(key: string): string {
  if (!key) return "";
  if (R2_PUBLIC_BASE_URL) return `${R2_PUBLIC_BASE_URL}/${key.replace(/^\/+/, "")}`;
  return `${R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`}/${key.replace(/^\/+/, "")}`;
}

export async function getPresignedDownloadUrl(key: string, ttlSeconds = 300): Promise<string> {
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const bucket = bucketFor(key);
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(new S3Client(clientConfig()), command, { expiresIn: ttlSeconds });
}

export async function uploadBuffer(
  key: string,
  buffer: Buffer | Uint8Array,
  mimeType: string,
): Promise<{ bucket: string; key: string }> {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const bucket = bucketFor(key);
  await new S3Client(clientConfig()).send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    }),
  );
  return { bucket, key };
}

export async function deleteObject(key: string): Promise<void> {
  const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const bucket = bucketFor(key);
  await new S3Client(clientConfig()).send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

export function buildR2Key(type: string, uuid: string, version: string, fileName: string): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const safeType = type.replace(/[^a-z0-9-]/gi, "").toLowerCase() || "asset";
  const safeFile = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${safeType}/${yyyy}/${mm}/${uuid}/${version}/${safeFile}`;
}