import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import {
  getCategories,
  insertCategory,
  updateCategory as dbUpdateCategory,
  deleteCategory as dbDeleteCategory,
  getSetting,
  setSetting,
  closeBudgetCycle as dbCloseBudgetCycle,
  getCycleSavingsDeposits,
} from '../db/schema';
import { loadCategoryActuals } from './transactionsSlice';
import { loadSavings } from './savingsSlice';

// Builder only manages Must-Pay and Flexible now — Savings lives in its own section
// (closer in spirit to Liabilities), and 'liability' categories are always created
// with a 0 allocation and never compete for baseline budget.
const BUCKETS = ['must_pay', 'flexible'];
const BASELINE_KEY = 'monthly_baseline';

export const loadCategories = createAsyncThunk('budget/loadCategories', async () => {
  const rows = await getCategories();
  return rows;
});

export const loadMonthlyBaseline = createAsyncThunk('budget/loadMonthlyBaseline', async () => {
  const stored = await getSetting(BASELINE_KEY);
  return stored ? parseFloat(stored) : 0;
});

export const updateMonthlyBaseline = createAsyncThunk('budget/updateMonthlyBaseline', async (value) => {
  await setSetting(BASELINE_KEY, String(value));
  return value;
});

/** How much of THIS cycle's baseline has already been manually deposited into
 * Savings — distinct from the lifetime savings total, which also includes every
 * prior cycle's carry-over. Re-fetch after any manual deposit or cycle close so
 * the live "Unallocated" figure in the Builder stays accurate. */
export const loadCycleSavingsDeposits = createAsyncThunk('budget/loadCycleSavingsDeposits', async () => {
  return getCycleSavingsDeposits();
});

/**
 * Manually closes the current budget cycle — no calendar involved, the user decides
 * when. The baseline itself never changes here (only manual edits change it, e.g. a
 * raise); instead, whatever's genuinely left over sweeps into the default Savings
 * goal, and the cycle boundary resets so Dashboard/Builder start counting fresh.
 * Nothing is deleted.
 */
export const closeBudgetCycle = createAsyncThunk(
  'budget/closeBudgetCycle',
  async (_, { dispatch }) => {
    const result = await dbCloseBudgetCycle();
    await Promise.all([dispatch(loadCategoryActuals()), dispatch(loadSavings())]);
    return result;
  }
);

export const addCategory = createAsyncThunk(
  'budget/addCategory',
  async ({ name, bucket, amount, icon, color }) => {
    const id = await insertCategory({
      name,
      bucket,
      icon,
      color,
      allocated_amount: amount,
    });
    return { id, name, bucket, amount, icon, color };
  }
);

export const editCategory = createAsyncThunk(
  'budget/editCategory',
  async ({ id, name, amount }) => {
    await dbUpdateCategory(id, { name, allocated_amount: amount });
    return { id, name, amount };
  }
);

export const removeCategory = createAsyncThunk('budget/removeCategory', async (id) => {
  await dbDeleteCategory(id);
  return id;
});

const initialState = {
  monthlyBaseline: 0,
  categories: [], // { id, name, bucket, allocated_amount, icon, color }
  cycleSavingsDeposits: 0, // manual "Add Money" deposits made since the current cycle started
  status: 'idle',
  lastCycleClose: null, // { actualSpent, remaining, deposited, newSavingsTotal } — for the confirmation toast
};

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    reset() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadCategories.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadCategories.fulfilled, (state, action) => {
        state.status = 'idle';
        state.categories = action.payload;
      })
      .addCase(loadMonthlyBaseline.fulfilled, (state, action) => {
        state.monthlyBaseline = action.payload;
      })
      .addCase(updateMonthlyBaseline.fulfilled, (state, action) => {
        state.monthlyBaseline = action.payload;
      })
      .addCase(closeBudgetCycle.fulfilled, (state, action) => {
        state.lastCycleClose = action.payload;
        state.cycleSavingsDeposits = 0; // dbCloseBudgetCycle() resets this same counter server-side
      })
      .addCase(loadCycleSavingsDeposits.fulfilled, (state, action) => {
        state.cycleSavingsDeposits = action.payload;
      })
      .addCase(addCategory.fulfilled, (state, action) => {
        state.categories.push({
          id: action.payload.id,
          name: action.payload.name,
          bucket: action.payload.bucket,
          allocated_amount: action.payload.amount,
          icon: action.payload.icon,
          color: action.payload.color,
          rollover_enabled: 1,
        });
      })
      .addCase(editCategory.fulfilled, (state, action) => {
        const cat = state.categories.find((c) => c.id === action.payload.id);
        if (cat) {
          cat.name = action.payload.name;
          cat.allocated_amount = action.payload.amount;
        }
      })
      .addCase(removeCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter((c) => c.id !== action.payload);
      });
  },
});

export const { reset: resetBudget } = budgetSlice.actions;

// ---------- Selectors: real-time allocation math ----------

export const selectBucketTotal = (state, bucket) =>
  state.budget.categories
    .filter((c) => c.bucket === bucket)
    .reduce((sum, c) => sum + Number(c.allocated_amount || 0), 0);

const selectCategories = (state) => state.budget.categories;
const selectMonthlyBaseline = (state) => state.budget.monthlyBaseline;
const selectSavingsTotalRaw = (state) => state.savings?.total ?? 0;
const selectCycleSavingsDepositsRaw = (state) => state.budget.cycleSavingsDeposits;

// Memoized with createSelector so it returns the same object reference when its
// inputs haven't changed — an unmemoized version rebuilds totals/percentages on
// every call, which React 18's dev-mode double-invoke check flags as an unstable
// selector (and, in practice, causes extra re-renders on every store update).
export const selectAllocationSummary = createSelector(
  [selectCategories, selectMonthlyBaseline, selectSavingsTotalRaw, selectCycleSavingsDepositsRaw],
  (categories, baseline, savingsTotal, cycleSavingsDeposits) => {
    const totals = BUCKETS.reduce((acc, bucket) => {
      acc[bucket] = categories
        .filter((c) => c.bucket === bucket)
        .reduce((sum, c) => sum + Number(c.allocated_amount || 0), 0);
      return acc;
    }, {});
    const allocated = BUCKETS.reduce((sum, b) => sum + totals[b], 0);
    // Only THIS cycle's savings deposits are "spoken for" against baseline — savingsTotal
    // is a lifetime, ever-growing figure (every prior cycle's carry-over included), while
    // baseline is a recurring per-cycle amount. Subtracting the lifetime total here would
    // make Unallocated permanently floor at 0 once cumulative savings ever exceeds baseline.
    const unallocated = Math.max(0, baseline - allocated - cycleSavingsDeposits);
    const isOverAllocated = allocated + cycleSavingsDeposits > baseline;

    return {
      baseline,
      totals,
      allocated,
      savingsTotal,
      cycleSavingsDeposits,
      unallocated,
      isOverAllocated,
      percentages: {
        must_pay: baseline ? (totals.must_pay / baseline) * 100 : 0,
        flexible: baseline ? (totals.flexible / baseline) * 100 : 0,
        savings: baseline ? (cycleSavingsDeposits / baseline) * 100 : 0,
        free: baseline ? Math.max(0, 100 - ((allocated + cycleSavingsDeposits) / baseline) * 100) : 0,
      },
    };
  }
);

/** How much more can still be allocated (Builder categories or Savings deposits) before hitting baseline. */
export const selectRemainingAllocatable = createSelector(
  [selectAllocationSummary],
  (summary) => summary.unallocated
);

export default budgetSlice.reducer;
