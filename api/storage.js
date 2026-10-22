// ponytail: Backward-compatibility facade for lib/server/storage.ts. Upgrade path: direct import from @/lib/server/storage.
export {
  isSupabaseConfigured,
  isR2Configured,
  isStorageConfigured,
  getR2Client,
  setS3ClientForTesting,
  uploadProofImage
} from '../lib/server/storage.ts';
