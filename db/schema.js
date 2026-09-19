import * as SQLite from 'expo-sqlite';

// Each user profile gets its own isolated SQLite database file, keyed by user id.
// `activeUserId` tracks whichever profile is currently logged in; every CRUD helper
// below implicitly operates against that profile's database via getDb().
let dbInstance = null;
let activeUserId = null;
const dbCache = new Map(); // userId -> db handle

export function dbNameForUser(userId) {
  return `halk_user_${userId}.db`;
}

export const SQLITE_DIRECTORY = SQLite.defaultDatabaseDirectory;

export function getActiveUserId() {
  return activeUserId;
}

export async function getDb() {
  if (!dbInstance) {
    throw new Error('No active user session — call setActiveUserDatabase first.');
  }
  return dbInstance;
}

async function runMigrations(db) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      bucket TEXT NOT NULL DEFAULT 'flexible',
      color TEXT DEFAULT '#22c55e',
      icon TEXT DEFAULT 'label',
      allocated_amount REAL NOT NULL DEFAULT 0,
      rollover_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      amount REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'expense',
      date TEXT NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS liabilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      reason TEXT,
      principal_amount REAL NOT NULL DEFAULT 0,
      category_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      is_default INTEGER NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ---------- Settings (simple per-user key/value store) ----------

export async function getSetting(key) {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?;', [key]);
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [key, value]
  );
}

// The active user's own database stores a copy of its profile fields too (not just
// the device-wide SecureStore list), so a backup file is self-describing on import.
export async function writeProfileToSettings({ name, username, mobile }) {
  await Promise.all([
    setSetting('profile_name', name || ''),
    setSetting('profile_username', username || ''),
    setSetting('profile_mobile', mobile || ''),
  ]);
}

export async function readProfileFromSettings() {
  const [name, username, mobile] = await Promise.all([
    getSetting('profile_name'),
    getSetting('profile_username'),
    getSetting('profile_mobile'),
  ]);
  return { name: name || '', username: username || '', mobile: mobile || '' };
}

/** Opens (or reuses a cached handle for) the given user's database and makes it active. */
export async function setActiveUserDatabase(userId) {
  if (dbCache.has(userId)) {
    dbInstance = dbCache.get(userId);
    activeUserId = userId;
    return dbInstance;
  }
  const db = await SQLite.openDatabaseAsync(dbNameForUser(userId));
  await runMigrations(db);
  dbCache.set(userId, db);
  dbInstance = db;
  activeUserId = userId;
  return db;
}

/** Returns the active database's full contents as raw bytes via SQLite's own
 * serialize API — entirely in-memory, through the same already-open connection
 * used for every other query. No other native module ever touches the live .db
 * file on disk this way, which sidesteps the Android file-locking / Expo Go
 * sandboxing errors that both a raw filesystem copy and VACUUM INTO ran into. */
export async function serializeActiveDatabase() {
  const db = await getDb();
  return db.serializeAsync();
}

// Every table a backup file can contain, in an order that inserts parents (categories)
// before the rows that reference them (transactions/liabilities) — foreign keys aren't
// enforced here (PRAGMA foreign_keys is never turned on), but it keeps the copy sane.
const BACKUP_TABLES = ['categories', 'liabilities', 'transactions', 'savings_goals', 'settings'];

/** Loads a picked .halkbackup file into a brand-new per-user database. VACUUM INTO
 * was tried twice for this (once targeting the cache directory for export, once
 * targeting the SQLite directory for import) and failed both times — including with
 * a raw "unable to open database file" from SQLite itself, so the command appears to
 * just not work in this expo-sqlite build. This avoids it entirely: `newUserId`'s
 * database file is created the exact same way every ordinary new account's is
 * (openDatabaseAsync + runMigrations, proven reliable throughout this app), the
 * picked file is ATTACHed to that connection by its real path, and each table's
 * rows are copied over with plain INSERT ... SELECT — no serialize/deserialize, no
 * VACUUM INTO, nothing outside of operations already proven to work here. */
export async function importBackupIntoNewAccount(sourcePath, newUserId) {
  const destDb = await SQLite.openDatabaseAsync(dbNameForUser(newUserId));
  try {
    await runMigrations(destDb);
    await destDb.runAsync('ATTACH DATABASE ? AS backup;', [sourcePath]);
    try {
      for (const table of BACKUP_TABLES) {
        // eslint-disable-next-line no-await-in-loop
        await destDb.execAsync(`INSERT INTO main.${table} SELECT * FROM backup.${table};`);
      }
      // AUTOINCREMENT relies on sqlite_sequence to guarantee ids are never reused —
      // without copying it too, a freshly-created empty table's counter would start
      // back at 0 and could collide with the imported rows' existing ids.
      await destDb.execAsync(
        'INSERT OR REPLACE INTO main.sqlite_sequence (name, seq) SELECT name, seq FROM backup.sqlite_sequence;'
      );
    } finally {
      await destDb.execAsync('DETACH DATABASE backup;');
    }
  } finally {
    await destDb.closeAsync();
  }
}

export function clearActiveUserDatabase() {
  dbInstance = null;
  activeUserId = null;
}

/** Permanently deletes one user's database file (used by "Delete Account"). */
export async function deleteUserDatabase(userId) {
  const cached = dbCache.get(userId);
  dbCache.delete(userId);
  if (activeUserId === userId) {
    dbInstance = null;
    activeUserId = null;
  }
  if (cached) {
    // Close the handle first — deleting a file the native layer still has open can fail
    // or leave a locked/orphaned file behind on some platforms.
    await cached.closeAsync().catch(() => {});
  }
  await SQLite.deleteDatabaseAsync(dbNameForUser(userId));
}

// ---------- Categories ----------

export async function getCategories() {
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM categories ORDER BY bucket, id ASC;');
}

export async function insertCategory({ name, bucket, color, icon, allocated_amount, rollover_enabled = 1 }) {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO categories (name, bucket, color, icon, allocated_amount, rollover_enabled)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [name, bucket, color ?? '#22c55e', icon ?? 'label', allocated_amount ?? 0, rollover_enabled ? 1 : 0]
  );
  return result.lastInsertRowId;
}

export async function updateCategory(id, { name, allocated_amount }) {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET name = ?, allocated_amount = ? WHERE id = ?;', [name, allocated_amount, id]);
}

export async function deleteCategory(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories WHERE id = ?;', [id]);
}

export async function updateCategoryAllocation(id, allocated_amount) {
  const db = await getDb();
  await db.runAsync('UPDATE categories SET allocated_amount = ? WHERE id = ?;', [allocated_amount, id]);
}

export async function clearAllCategories() {
  const db = await getDb();
  await db.runAsync('DELETE FROM categories;');
}

// ---------- Transactions ----------

export async function getTransactions({ from, to } = {}) {
  const db = await getDb();
  if (from && to) {
    return db.getAllAsync(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.bucket AS category_bucket
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE date(t.date) BETWEEN date(?) AND date(?)
       ORDER BY t.date DESC, t.id DESC;`,
      [from, to]
    );
  }
  return db.getAllAsync(
    `SELECT t.*, c.name AS category_name, c.icon AS category_icon, c.bucket AS category_bucket
     FROM transactions t
     LEFT JOIN categories c ON c.id = t.category_id
     ORDER BY t.date DESC, t.id DESC;`
  );
}

export async function insertTransaction({ category_id, amount, type = 'expense', date, note = '' }) {
  const db = await getDb();
  const result = await db.runAsync(
    `INSERT INTO transactions (category_id, amount, type, date, note) VALUES (?, ?, ?, ?, ?);`,
    [category_id ?? null, amount, type, date, note]
  );
  return result.lastInsertRowId;
}

export async function deleteTransaction(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM transactions WHERE id = ?;', [id]);
}

/**
 * Per-category actual spend since a given timestamp (the current budget cycle's
 * start). `sinceDate` of null/undefined means "since forever" — every expense ever
 * logged — which is the correct default for an account that hasn't closed its first
 * cycle yet. Compared via created_at (full timestamp), not the calendar date, so
 * closing mid-day and logging more expenses the same day works correctly.
 */
export async function getCategoryActualsSince(sinceDate) {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT c.id AS category_id, COALESCE(SUM(t.amount), 0) AS actual
     FROM categories c
     LEFT JOIN transactions t
       ON t.category_id = c.id
      AND t.type = 'expense'
      ${sinceDate ? 'AND datetime(t.created_at) >= datetime(?)' : ''}
     GROUP BY c.id;`,
    sinceDate ? [sinceDate] : []
  );
  return rows.reduce((acc, row) => {
    acc[row.category_id] = row.actual;
    return acc;
  }, {});
}

export async function getCycleStart() {
  return getSetting('cycle_start');
}

/**
 * Manually closes the current budget cycle (no calendar involved — the user decides
 * when). Savings now lives entirely outside Builder, so the baseline itself never
 * changes on close (it only changes when the user edits it, e.g. a raise) — instead,
 * whatever's genuinely left over (Must-Pay/Flexible surplus, plus any baseline slice
 * that was never allocated to anything) gets swept into the default Savings goal.
 * Money already sitting in Savings is excluded so a steady-state cycle (same spend
 * pattern, nothing new allocated) doesn't re-sweep the same "idle" amount every time.
 * Liabilities are never part of this. Nothing is deleted — old transactions remain
 * fully intact for Reports.
 */
export async function closeBudgetCycle() {
  const db = await getDb();
  const cycleStart = await getSetting('cycle_start');
  const baselineStr = await getSetting('monthly_baseline');
  const baseline = baselineStr ? parseFloat(baselineStr) : 0;

  const budgetedRow = await db.getFirstAsync(
    `SELECT COALESCE(SUM(allocated_amount), 0) AS total FROM categories WHERE bucket IN ('must_pay', 'flexible');`
  );
  const budgeted = budgetedRow?.total ?? 0;

  const savingsTotalRow = await db.getFirstAsync(`SELECT COALESCE(SUM(amount), 0) AS total FROM savings_goals;`);
  const savingsTotal = savingsTotalRow?.total ?? 0;

  // Only THIS cycle's manual "Add Money from Unallocated" deposits count against the
  // baseline slice that's still idle — savingsTotal is a lifetime, ever-growing figure
  // (it includes every previous cycle's carry-over), while baseline is a recurring
  // per-cycle amount. Subtracting the lifetime total here was the bug: once cumulative
  // savings ever exceeded baseline, "idle" floored at 0 forever and stopped sweeping
  // real unallocated money on every later close.
  const cycleDepositsStr = await getSetting('cycle_savings_deposits');
  const cycleSavingsDeposits = cycleDepositsStr ? parseFloat(cycleDepositsStr) : 0;

  // Compare by full timestamp (created_at), not just the calendar date — the user can
  // close a cycle and log more expenses later the same day, and a day-only comparison
  // would wrongly re-include the pre-close ones. Both sides go through SQLite's own
  // datetime() so the ISO-with-T-and-Z format (cycle_start) and the "YYYY-MM-DD HH:MM:SS"
  // format (created_at) are normalized to the same comparable form.
  const spentRow = await db.getFirstAsync(
    `SELECT COALESCE(SUM(t.amount), 0) AS actual
     FROM transactions t
     JOIN categories c ON c.id = t.category_id
     WHERE t.type = 'expense'
       AND c.bucket IN ('must_pay', 'flexible')
       ${cycleStart ? 'AND datetime(t.created_at) >= datetime(?)' : ''};`,
    cycleStart ? [cycleStart] : []
  );
  const actualSpent = spentRow?.actual ?? 0;

  const surplus = budgeted - actualSpent; // Must-Pay + Flexible unspent (can be negative if overspent)
  const currentlyIdle = Math.max(0, baseline - budgeted - cycleSavingsDeposits); // this cycle's baseline slice never allocated at all
  const remaining = surplus + currentlyIdle;
  const deposit = Math.max(0, remaining); // never pull money OUT of savings just for overspending

  const defaultGoalId = await ensureDefaultSavingsGoal();
  if (deposit > 0) {
    await db.runAsync('UPDATE savings_goals SET amount = amount + ? WHERE id = ?;', [deposit, defaultGoalId]);
  }

  const now = new Date().toISOString();
  await setSetting('cycle_start', now);
  await setSetting('cycle_savings_deposits', '0');

  return { actualSpent, remaining, deposited: deposit, newSavingsTotal: savingsTotal + deposit, cycleStart: now };
}

// ---------- Savings ----------
// Savings lives separately from Builder's budgeting categories — closer in spirit to
// Liabilities than to Must-Pay/Flexible. A protected "default" goal always exists and
// is what Close Budget deposits into automatically; users can also create additional
// named goals and deposit into any of them manually from unallocated baseline money.

export async function ensureDefaultSavingsGoal() {
  const db = await getDb();
  const existing = await db.getFirstAsync(`SELECT id FROM savings_goals WHERE is_default = 1 LIMIT 1;`);
  if (existing) return existing.id;
  const result = await db.runAsync(`INSERT INTO savings_goals (name, is_default, amount) VALUES ('General Savings', 1, 0);`);
  return result.lastInsertRowId;
}

export async function getSavingsGoals() {
  await ensureDefaultSavingsGoal();
  const db = await getDb();
  return db.getAllAsync('SELECT * FROM savings_goals ORDER BY is_default DESC, created_at ASC;');
}

export async function getTotalSavings() {
  const db = await getDb();
  const row = await db.getFirstAsync('SELECT COALESCE(SUM(amount), 0) AS total FROM savings_goals;');
  return row?.total ?? 0;
}

export async function insertSavingsGoal({ name, amount = 0 }) {
  const db = await getDb();
  const result = await db.runAsync('INSERT INTO savings_goals (name, is_default, amount) VALUES (?, 0, ?);', [name, amount]);
  return result.lastInsertRowId;
}

export async function deleteSavingsGoal(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM savings_goals WHERE id = ? AND is_default = 0;', [id]);
}

/** Manual deposits are always sourced from this cycle's Unallocated money (the UI
 * caps the amount against it), so track them separately from the lifetime savings
 * total — closeBudgetCycle needs to know how much of THIS cycle's baseline has
 * already been claimed by savings, not how much has ever been saved. */
export async function depositToSavingsGoal(id, amount) {
  const db = await getDb();
  await db.runAsync('UPDATE savings_goals SET amount = amount + ? WHERE id = ?;', [amount, id]);
  const cycleDepositsStr = await getSetting('cycle_savings_deposits');
  const cycleSavingsDeposits = cycleDepositsStr ? parseFloat(cycleDepositsStr) : 0;
  await setSetting('cycle_savings_deposits', String(cycleSavingsDeposits + amount));
}

export async function getCycleSavingsDeposits() {
  const value = await getSetting('cycle_savings_deposits');
  return value ? parseFloat(value) : 0;
}

/** Draws `amount` out of savings for a liability repayment, default goal first
 * then other goals by balance, so a single pool amount can fund the repay
 * without the caller having to know which named goal holds the money. */
export async function withdrawFromSavings(amount) {
  const db = await getDb();
  await ensureDefaultSavingsGoal();
  const goals = await db.getAllAsync('SELECT id, amount FROM savings_goals ORDER BY is_default DESC, amount DESC;');
  let remaining = amount;
  for (const goal of goals) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, goal.amount);
    if (take > 0) {
      // eslint-disable-next-line no-await-in-loop
      await db.runAsync('UPDATE savings_goals SET amount = amount - ? WHERE id = ?;', [take, goal.id]);
      remaining -= take;
    }
  }
}

// ---------- Liabilities ----------
// A liability is a debt (e.g. borrowed from a neighbour). Creating one also creates a
// linked, zero-allocated category of bucket 'liability' so it can be selected in Expense.

export async function getLiabilities() {
  const db = await getDb();
  return db.getAllAsync(
    `SELECT l.*, c.name AS category_name
     FROM liabilities l
     LEFT JOIN categories c ON c.id = l.category_id
     ORDER BY l.created_at DESC;`
  );
}

export async function insertLiability({ name, reason, principal_amount }) {
  const db = await getDb();
  const categoryId = await insertCategory({
    name,
    bucket: 'liability',
    icon: 'account-balance',
    color: '#855300',
    allocated_amount: 0,
  });
  const result = await db.runAsync(
    `INSERT INTO liabilities (name, reason, principal_amount, category_id) VALUES (?, ?, ?, ?);`,
    [name, reason ?? '', principal_amount ?? 0, categoryId]
  );
  return { id: result.lastInsertRowId, categoryId };
}

export async function deleteLiability(id, categoryId) {
  const db = await getDb();
  await db.runAsync('DELETE FROM liabilities WHERE id = ?;', [id]);
  if (categoryId) {
    await db.runAsync('DELETE FROM categories WHERE id = ?;', [categoryId]);
  }
}

/**
 * Repays part of a liability: reduces what's owed and simultaneously records real
 * spending against the categories that funded the repayment (so Dashboard/Builder
 * remaining balances reflect it too). `allocations` is [{ category_id, amount }, ...]
 * and, together with `savingsAmount`, must sum to `amount`. `savingsAmount` is pulled
 * straight out of the savings pool rather than posted as a category transaction.
 */
export async function repayLiability({ liabilityCategoryId, amount, allocations, savingsAmount = 0, date, note }) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO transactions (category_id, amount, type, date, note) VALUES (?, ?, 'expense', ?, ?);`,
      [liabilityCategoryId, -amount, date, note ?? 'Repayment']
    );
    for (const alloc of allocations) {
      // eslint-disable-next-line no-await-in-loop
      await db.runAsync(
        `INSERT INTO transactions (category_id, amount, type, date, note) VALUES (?, ?, 'expense', ?, ?);`,
        [alloc.category_id, alloc.amount, date, note ?? 'Liability repayment']
      );
    }
    if (savingsAmount > 0) {
      await withdrawFromSavings(savingsAmount);
    }
  });
}

/** Amount currently owed per liability = principal + all expenses logged against its category. */
export async function getLiabilityOwedAmounts() {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT l.id AS liability_id,
            l.principal_amount + COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) AS owed
     FROM liabilities l
     LEFT JOIN transactions t ON t.category_id = l.category_id
     GROUP BY l.id;`
  );
  return rows.reduce((acc, row) => {
    acc[row.liability_id] = row.owed;
    return acc;
  }, {});
}
