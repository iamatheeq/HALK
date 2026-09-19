import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  setActiveUserDatabase,
  clearActiveUserDatabase,
  deleteUserDatabase,
  writeProfileToSettings,
  setSetting,
} from '../db/schema';

const USERS_KEY = 'halk_users_v1'; // JSON array of { id, name, username, mobile, avatarUri }
const LAST_USER_KEY = 'halk_last_user_id';
const ONBOARDED_KEY = 'halk_onboarded';

function normalizeUsername(username) {
  return (username || '').trim().toLowerCase();
}

async function readUsers() {
  const raw = await SecureStore.getItemAsync(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}
async function writeUsers(users) {
  await SecureStore.setItemAsync(USERS_KEY, JSON.stringify(users));
}

/** Prompts the device's own PIN/pattern/fingerprint/Face ID — the same system check
 * regardless of which account is being unlocked. HALK never stores its own PIN. */
async function verifyWithSystemAuth(promptMessage) {
  const [hardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  if (!hardware || !enrolled) {
    // Device has no PIN/biometric configured at all — nothing we can gate on, so we
    // fail open rather than lock the user out of an app they have no way to unlock.
    return { available: false, success: true };
  }
  const result = await LocalAuthentication.authenticateAsync({ promptMessage, disableDeviceFallback: false });
  return { available: true, success: result.success };
}

// ---------- Bootstrapping ----------

export const bootstrap = createAsyncThunk('users/bootstrap', async () => {
  const [users, onboardedPref, lastUserId] = await Promise.all([
    readUsers(),
    SecureStore.getItemAsync(ONBOARDED_KEY),
    SecureStore.getItemAsync(LAST_USER_KEY),
  ]);
  return {
    users,
    onboarded: onboardedPref === 'true',
    lastUserId: lastUserId || null,
  };
});

export const completeOnboarding = createAsyncThunk('users/completeOnboarding', async () => {
  await SecureStore.setItemAsync(ONBOARDED_KEY, 'true');
  return true;
});

// ---------- Account creation ----------

export const createAccount = createAsyncThunk(
  'users/createAccount',
  async ({ name, username, mobile, avatarUri }, { rejectWithValue }) => {
    const normalized = normalizeUsername(username);
    if (!normalized) {
      return rejectWithValue({ field: 'username', message: 'Username is required.' });
    }
    const users = await readUsers();
    if (users.some((u) => normalizeUsername(u.username) === normalized)) {
      return rejectWithValue({ field: 'username', message: 'That username is already taken on this device.' });
    }
    const id = `u_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
    const record = { id, name: name?.trim() || '', username: normalized, mobile: mobile?.trim() || '', avatarUri: avatarUri || null };
    users.push(record);
    await writeUsers(users);
    await SecureStore.setItemAsync(LAST_USER_KEY, id);
    await setActiveUserDatabase(id);
    await writeProfileToSettings(record);
    await setSetting('cycle_start', new Date().toISOString());
    return record;
  }
);

export const updateProfile = createAsyncThunk(
  'users/updateProfile',
  async ({ userId, name, mobile, avatarUri }) => {
    const users = await readUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { userId, name, mobile, avatarUri };
    users[idx] = { ...users[idx], name: name?.trim() || '', mobile: mobile?.trim() || '', avatarUri: avatarUri ?? users[idx].avatarUri };
    await writeUsers(users);
    await writeProfileToSettings(users[idx]);
    return users[idx];
  }
);

// ---------- Login / switch ----------

export const unlockAccount = createAsyncThunk(
  'users/unlockAccount',
  async (userId, { getState, rejectWithValue }) => {
    const user = getState().users.users.find((u) => u.id === userId);
    if (!user) return rejectWithValue('Account not found.');
    const { success } = await verifyWithSystemAuth(`Unlock HALK — ${user.name || user.username}`);
    if (!success) return rejectWithValue('Authentication was cancelled or failed.');
    await SecureStore.setItemAsync(LAST_USER_KEY, user.id);
    await setActiveUserDatabase(user.id);
    return user;
  }
);

export const logout = createAsyncThunk('users/logout', async () => {
  clearActiveUserDatabase();
  return true;
});

// ---------- Delete account / import ----------

export const deleteAccount = createAsyncThunk(
  'users/deleteAccount',
  async (userId, { getState, rejectWithValue }) => {
    const user = getState().users.users.find((u) => u.id === userId);
    if (!user) return rejectWithValue('Account not found.');
    const { success } = await verifyWithSystemAuth(`Confirm deleting "${user.name || user.username}"`);
    if (!success) return rejectWithValue('Authentication was cancelled or failed.');

    const users = await readUsers();
    const remaining = users.filter((u) => u.id !== userId);
    await writeUsers(remaining);
    await deleteUserDatabase(userId);

    const lastUserId = await SecureStore.getItemAsync(LAST_USER_KEY);
    if (lastUserId === userId) {
      await SecureStore.deleteItemAsync(LAST_USER_KEY);
    }
    return { userId, remainingUsers: remaining };
  }
);

/** Registers an account restored from a backup file — the .db file itself has
 * already been copied into place by backupService before this runs. */
export const registerImportedAccount = createAsyncThunk(
  'users/registerImportedAccount',
  async ({ id, name, username, mobile }, { rejectWithValue }) => {
    const normalized = normalizeUsername(username);
    const users = await readUsers();
    if (users.some((u) => u.id === id)) {
      return rejectWithValue('This backup has already been imported on this device.');
    }
    let finalUsername = normalized;
    let suffix = 2;
    while (users.some((u) => normalizeUsername(u.username) === finalUsername)) {
      finalUsername = `${normalized}${suffix}`;
      suffix += 1;
    }
    const record = { id, name: name || '', username: finalUsername, mobile: mobile || '', avatarUri: null };
    users.push(record);
    await writeUsers(users);
    return record;
  }
);

const initialState = {
  status: 'checking', // checking | onboarding | no_account | locked | unlocked | error
  onboarded: false,
  users: [], // [{ id, name, username, mobile, avatarUri, biometricEnabled }]
  activeUser: null,
  lastUserId: null,
  error: null,
};

function computeStatus({ onboarded, usersCount }) {
  if (!onboarded) return 'onboarding';
  if (usersCount === 0) return 'no_account';
  return 'locked';
}

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(bootstrap.fulfilled, (state, action) => {
        state.onboarded = action.payload.onboarded;
        state.users = action.payload.users;
        state.lastUserId = action.payload.lastUserId;
        state.status = computeStatus({ onboarded: action.payload.onboarded, usersCount: action.payload.users.length });
      })
      .addCase(bootstrap.rejected, (state, action) => {
        // Never leave the app stuck on the loading spinner — surface a recoverable
        // error screen instead of hanging forever if secure storage can't be read.
        state.status = 'error';
        state.error = action.error?.message || 'Could not read local storage.';
      })
      .addCase(completeOnboarding.fulfilled, (state) => {
        state.onboarded = true;
        state.status = computeStatus({ onboarded: true, usersCount: state.users.length });
      })
      .addCase(createAccount.fulfilled, (state, action) => {
        state.users.push(action.payload);
        state.activeUser = action.payload;
        state.lastUserId = action.payload.id;
        state.status = 'unlocked';
        state.error = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        const idx = state.users.findIndex((u) => u.id === action.payload.id);
        if (idx !== -1) state.users[idx] = action.payload;
        if (state.activeUser?.id === action.payload.id) state.activeUser = action.payload;
      })
      .addCase(unlockAccount.fulfilled, (state, action) => {
        state.activeUser = action.payload;
        state.lastUserId = action.payload.id;
        state.status = 'unlocked';
        state.error = null;
      })
      .addCase(unlockAccount.rejected, (state, action) => {
        state.error = action.payload || 'Could not unlock account.';
      })
      .addCase(logout.fulfilled, (state) => {
        state.activeUser = null;
        state.status = 'locked';
      })
      .addCase(deleteAccount.fulfilled, (state, action) => {
        state.users = action.payload.remainingUsers;
        state.activeUser = null;
        state.status = computeStatus({ onboarded: state.onboarded, usersCount: state.users.length });
      })
      .addCase(deleteAccount.rejected, (state, action) => {
        state.error = action.payload || 'Could not delete account.';
      })
      .addCase(registerImportedAccount.fulfilled, (state, action) => {
        state.users.push(action.payload);
        state.status = computeStatus({ onboarded: state.onboarded, usersCount: state.users.length });
      });
  },
});

export const { clearError } = usersSlice.actions;
export default usersSlice.reducer;
