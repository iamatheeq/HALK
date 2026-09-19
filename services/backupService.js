// The default `expo-file-system` export now points at the new File/Directory API;
// the classic getInfoAsync/makeDirectoryAsync/copyAsync functions used here still
// live under the explicit legacy import.
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { serializeActiveDatabase, importBackupIntoNewAccount } from '../db/schema';
import { suppressNextBackgroundLock } from './systemUIGuard';

function stripFileScheme(uri) {
  return uri.startsWith('file://') ? uri.slice('file://'.length) : uri;
}

// Pure-JS base64 encoder — no native FileSystem read of the SQLite directory is
// involved in producing this, so there's nothing for Android/Expo Go's cross-module
// file-access checks to reject. Small enough datasets (a personal budget database)
// that a plain JS loop is more than fast enough.
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function bytesToBase64(bytes) {
  let result = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    result += BASE64_CHARS[bytes[i] >> 2];
    result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += BASE64_CHARS[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    result += BASE64_CHARS[bytes[i + 2] & 63];
  }
  const remaining = bytes.length - i;
  if (remaining === 1) {
    result += BASE64_CHARS[bytes[i] >> 2];
    result += BASE64_CHARS[(bytes[i] & 3) << 4];
    result += '==';
  } else if (remaining === 2) {
    result += BASE64_CHARS[bytes[i] >> 2];
    result += BASE64_CHARS[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    result += BASE64_CHARS[(bytes[i + 1] & 15) << 2];
    result += '=';
  }
  return result;
}

// The database bytes come from SQLite's own in-memory serialize() on the already-open
// connection — nothing ever asks expo-file-system to read the live .db file directly
// (that raw copy, and even a VACUUM INTO writing a fresh file, both failed under
// Expo Go's cross-module file-access checks against the SQLite-owned directory).
function backupFileName(username) {
  const safeName = (username || 'halk_account').replace(/[^a-z0-9_-]/gi, '_');
  return `HALK_Backup_${safeName}_${Date.now()}.halkbackup`;
}

/** Saves the given user's backup straight into a folder the person picks (e.g.
 * Downloads) via Android's Storage Access Framework — a real "download", not a
 * share-sheet handoff. The share sheet's "Save to device" only actually persists
 * a file if the person happens to pick an app that does that; SAF's directory
 * picker writes the file directly, no intermediate app involved. Android only —
 * there is no SAF equivalent on iOS. */
export async function saveBackupToDevice(userId, username) {
  if (Platform.OS !== 'android') {
    throw new Error('Direct download is only available on Android.');
  }
  // Opening the SAF folder picker backgrounds the app just like the share sheet
  // does — without this, the AppState-based auto-lock logs the user out mid-save,
  // clearing the active database session before the write can finish.
  suppressNextBackgroundLock();
  const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    throw new Error('Folder access was not granted.');
  }

  const bytes = await serializeActiveDatabase();
  const base64 = bytesToBase64(bytes);
  const fileName = backupFileName(username);

  const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
    permissions.directoryUri,
    fileName,
    'application/octet-stream'
  );
  await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return fileUri;
}

/** Opens the system file picker for a .halkbackup file and loads it into a new
 * per-user database, ready to be opened and registered. expo-file-system's
 * readAsStringAsync and writeAsStringAsync, and even SQLite's own VACUUM INTO,
 * all failed against the SQLite-owned directory in this environment — so the
 * picked file is instead ATTACHed by its real path directly onto a normal new
 * account's connection and copied table-by-table with plain SQL. See
 * importBackupIntoNewAccount for the actual mechanism. */
export async function importBackupFile() {
  suppressNextBackgroundLock();
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;

  const sourcePath = stripFileScheme(result.assets[0].uri);
  const newUserId = `u_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;

  await importBackupIntoNewAccount(sourcePath, newUserId);
  return newUserId;
}
