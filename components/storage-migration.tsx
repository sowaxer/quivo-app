'use client';

import { useLayoutEffect } from 'react';
import { migrateLegacyStorageKeys } from '@/lib/migrate-legacy-storage';

/** Runs before paint so first reads of `quivo_*` keys see migrated data. */
export function StorageMigration() {
  useLayoutEffect(() => {
    migrateLegacyStorageKeys();
  }, []);
  return null;
}
