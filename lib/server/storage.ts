import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

let r2ClientInstance: S3Client | null = null;

export interface UploadProofImageOptions {
  imageBase64?: string | null;
  buffer?: Buffer | null;
  mimeType?: string;
  questId?: string;
  userId?: string;
}

interface UploadToSupabaseOptions {
  fileBuffer: Buffer;
  mimeType?: string;
  key: string;
}

interface UploadToR2Options {
  fileBuffer: Buffer;
  mimeType?: string;
  key: string;
}

/**
 * Kiểm tra xem cấu hình Supabase Storage đã có đủ chưa (Không cần thẻ ngân hàng)
 */
export function isSupabaseConfigured(): boolean {
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
  return Boolean(url && key);
}

/**
 * Kiểm tra xem các cấu hình Cloudflare R2 đã đầy đủ chưa
 */
export function isR2Configured(): boolean {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = process.env.R2_BUCKET_NAME?.trim();

  return Boolean(accountId && accessKeyId && secretAccessKey && bucketName);
}

/**
 * Kiểm tra xem có bất kỳ dịch vụ Cloud Storage nào khả dụng không
 */
export function isStorageConfigured(): boolean {
  return isSupabaseConfigured() || isR2Configured();
}

/**
 * Khởi tạo singleton S3 Client tương thích Cloudflare R2
 */
export function getR2Client(): S3Client | null {
  if (!isR2Configured()) {
    return null;
  }

  if (!r2ClientInstance) {
    const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
    const endpoint = process.env.R2_ENDPOINT?.trim() || `https://${accountId}.r2.cloudflarestorage.com`;

    r2ClientInstance = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: (process.env.R2_ACCESS_KEY_ID || '').trim(),
        secretAccessKey: (process.env.R2_SECRET_ACCESS_KEY || '').trim()
      }
    });
  }

  return r2ClientInstance;
}

/**
 * Testing hook to set S3/R2 client
 */
export function setS3ClientForTesting(client: S3Client | null): void {
  r2ClientInstance = client;
}

/**
 * Tải ảnh lên Supabase Storage qua REST API (Chuẩn và cực nhẹ, không cần add thẻ ngân hàng)
 */
async function uploadToSupabase({ fileBuffer, mimeType, key }: UploadToSupabaseOptions): Promise<string> {
  const rawUrl = (process.env.SUPABASE_URL || '').trim();
  const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || '').trim();
  const bucket = (process.env.SUPABASE_BUCKET_NAME || 'proofs').trim();

  const endpoint = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${key}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    signal: AbortSignal.timeout(30000),
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': mimeType || 'image/jpeg',
      'x-upsert': 'true'
    },
    body: new Uint8Array(fileBuffer)
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    throw new Error(`Supabase Storage upload failed (${res.status}): ${errorText}`);
  }

  // Trả về Public URL xem ảnh trực tiếp
  return `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${key}`;
}

/**
 * Tải ảnh lên Cloudflare R2 qua S3 API
 */
async function uploadToR2({ fileBuffer, mimeType, key }: UploadToR2Options): Promise<string | null> {
  const s3 = getR2Client();
  if (!s3) return null;

  const bucket = (process.env.R2_BUCKET_NAME || '').trim();
  const publicUrlBase = (process.env.R2_PUBLIC_URL || '').trim().replace(/\/+$/, '');

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType || 'image/jpeg',
    CacheControl: 'public, max-age=2592000, immutable' // 30 ngày trong browser cache
  });

  await s3.send(command);

  if (publicUrlBase) {
    return `${publicUrlBase}/${key}`;
  }
  const accountId = (process.env.R2_ACCOUNT_ID || '').trim();
  return `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key}`;
}

/**
 * Tải ảnh bằng chứng nhiệm vụ lên Cloud Storage (Tự động chọn Supabase hoặc Cloudflare R2)
 */
export async function uploadProofImage({
  imageBase64 = null,
  buffer = null,
  mimeType = 'image/jpeg',
  questId = 'quest',
  userId = 'guest'
}: UploadProofImageOptions = {}): Promise<string | null> {
  if (!isStorageConfigured()) {
    return null;
  }

  try {
    let fileBuffer = buffer;
    if (!fileBuffer && typeof imageBase64 === 'string') {
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      fileBuffer = Buffer.from(base64Data, 'base64');
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      console.warn('[Storage] Dữ liệu ảnh rỗng, bỏ qua upload.');
      return null;
    }

    // Chuẩn hóa tên file an toàn
    const cleanUserId = String(userId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'guest';
    const cleanQuestId = String(questId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'quest';
    const yearMonth = new Date().toISOString().slice(0, 7);
    const filename = `${cleanUserId}_${cleanQuestId}_${Date.now()}.jpg`;
    const key = `${yearMonth}/${filename}`;

    // 1. Ưu tiên Supabase Storage nếu được cấu hình
    if (isSupabaseConfigured()) {
      return await uploadToSupabase({ fileBuffer, mimeType, key });
    }

    // 2. Dự phòng sang Cloudflare R2 nếu có cấu hình
    if (isR2Configured()) {
      return await uploadToR2({ fileBuffer, mimeType, key: `proofs/${key}` });
    }

    return null;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Storage] Lỗi tải ảnh lên Cloud Storage:', errorMsg);
    return null;
  }
}
