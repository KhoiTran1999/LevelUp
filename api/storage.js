// ponytail: Backward-compatibility facade for lib/server/storage. Upgrade path: direct import from @/lib/server/storage.
export {
  isSupabaseConfigured,
  isR2Configured,
  isStorageConfigured,
  getR2Client,
  setS3ClientForTesting,
  uploadProofImage
} from '../lib/server/storage';

export default function handler(req, res) {
  if (res && typeof res.status === 'function') {
    return res.status(404).json({ error: 'Storage API is internal.' });
  }
}

