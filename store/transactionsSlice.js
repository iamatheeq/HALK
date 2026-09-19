import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getTransactions,
  insertTransaction,
  deleteTransaction as dbDeleteTransaction,
  getCategoryActualsSince,
  getCycleStart,
} from '../db/schema';

export const loadTransactions = createAsyncThunk('transactions/load', async (filter) => {
  const rows = await getTransactions(filter || {});
  return rows;
});

/** Per-category spend since the current budget cycle started (not tied to any
 * calendar month — resets only when the user manually closes the cycle). */
export const loadCategoryActuals = createAsyncThunk('transactions/loadCategoryActuals', async () => {
  const cycleStart = await getCycleStart();
  return getCategoryActualsSince(cycleStart);
});

// Note: these thunks deliberately do NOT re-fetch the shared `items` list — screens
// that display a specific date range (ExpenseList, Reports) own their own reload via
// useFocusEffect, using their own current filter. Re-fetching here would silently
// clobber whatever range the user was viewing.
export const addExpense = createAsyncThunk(
  'transactions/addExpense',
  async ({ category_id, amount, date, note }, { dispatch }) => {
    await insertTransaction({ category_id, amount, type: 'expense', date, note });
    await dispatch(loadCategoryActuals());
    return true;
  }
);

export const removeTransaction = createAsyncThunk(
  'transactions/remove',
  async ({ id }, { dispatch }) => {
    await dbDeleteTransaction(id);
    await dispatch(loadCategoryActuals());
    return id;
  }
);

const initialState = {
  items: [],
  categoryActuals: {}, // category_id -> actual spend in the current cycle
  status: 'idle',
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    reset() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTransactions.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadTransactions.fulfilled, (state, action) => {
        state.status = 'idle';
        state.items = action.payload;
      })
      .addCase(loadCategoryActuals.fulfilled, (state, action) => {
        state.categoryActuals = action.payload;
      })
      .addCase(removeTransaction.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t.id !== action.payload);
      });
  },
});

export const { reset: resetTransactions } = transactionsSlice.actions;
export default transactionsSlice.reducer;
