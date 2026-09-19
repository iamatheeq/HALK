import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { registerImportedAccount } from '../store/usersSlice';
import { importBackupFile } from '../services/backupService';
import { setActiveUserDatabase, readProfileFromSettings, clearActiveUserDatabase, deleteUserDatabase } from '../db/schema';

/** Shared "Restore from Backup" flow — used both when picking an account (at least
 * one already exists on this device) and when creating the very first one (a fresh
 * install has none yet, so it can't reach the picker screen at all). Once the import
 * succeeds, the new account shows up in the users list and the app's status flips to
 * "locked", which is enough for the Gate in App.js to route to the account picker —
 * no explicit navigation needed here. */
export function useBackupImport() {
  const dispatch = useDispatch();
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const handleImport = async () => {
    setImportError('');
    setImporting(true);
    let newUserId = null;
    let success = false;
    try {
      newUserId = await importBackupFile();
      if (!newUserId) {
        setImporting(false);
        return false;
      }
      // Opening it and reading the profile settings doubles as validation — a file
      // that isn't actually a HALK backup will fail here rather than silently
      // registering a broken, empty-looking account.
      await setActiveUserDatabase(newUserId);
      const profile = await readProfileFromSettings();
      clearActiveUserDatabase();

      const result = await dispatch(
        registerImportedAccount({
          id: newUserId,
          name: profile.name,
          username: profile.username || `restored_${newUserId.slice(-4)}`,
          mobile: profile.mobile,
        })
      );
      if (registerImportedAccount.fulfilled.match(result)) {
        success = true;
      } else {
        setImportError(typeof result.payload === 'string' ? result.payload : 'Could not import this backup.');
        await deleteUserDatabase(newUserId);
      }
    } catch (e) {
      // Surface the real native error rather than a fixed guess — "not a valid
      // backup" is only one of several possible causes (a corrupt file, a picker
      // permission issue, etc.) and hiding the actual message makes those
      // impossible to tell apart from the outside.
      setImportError(`Could not import this backup: ${e.message || e}`);
      clearActiveUserDatabase();
      if (newUserId) await deleteUserDatabase(newUserId).catch(() => {});
    }
    setImporting(false);
    return success;
  };

  return { importing, importError, handleImport };
}
