import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getLiabilities,
  insertLiability,
  deleteLiability as dbDeleteLiability,
  getLiabilityOwedAmounts,
  repayLiability as dbRepayLiability,
} from '../db/schema';
import { loadCategories } from './budgetSlice';
import { loadCategoryActuals } from './transactionsSlice';
import { loadSavings } from './savingsSlice';

export const loadLiabilities = createAsyncThunk('liabilities/load', async (_, { dispatch }) => {
  const [rows, owed] = await Promise.all([getLiabilities(), getLiabilityOwedAmounts()]);
  return { rows, owed };
});

export const addLiability = createAsyncThunk(
  'liabilities/add',
  async ({ name, reason, amount }, { dispatch }) => {
    const { id, categoryId } = await insertLiability({ name, reason, principal_amount: amount });
    await dispatch(loadCategories());
    return { id, name, reason, principal_amount: amount, category_id: categoryId };
  }
);

export const removeLiability = createAsyncThunk(
  'liabilities/remove',
  async ({ id, categoryId }, { dispatch }) => {
    await dbDeleteLiability(id, categoryId);
    await dispatch(loadCategories());
    return id;
  }
);

/**
 * Repays part of a liability. `allocations` is [{ category_id, amount }, ...] naming
 * which must-pay/flexible/savings categories funded the repayment — those categories'
 * actual spend goes up (so Dashboard/Builder reflect real cash leaving), and the
 * liability's owed amount goes down by the same total.
 */
export const repayLiability = createAsyncThunk(
  'liabilities/repay',
  async ({ liabilityId, categoryId, amount, allocations, savingsAmount = 0, date, note }, { dispatch }) => {
    await dbRepayLiability({ liabilityCategoryId: categoryId, amount, allocations, savingsAmount, date, note });
    const [owed] = await Promise.all([
      getLiabilityOwedAmounts(),
      dispatch(loadCategoryActuals()),
      dispatch(loadSavings()),
    ]);
    return { liabilityId, owed };
  }
);

const initialState = {
  items: [], // { id, name, reason, principal_amount, category_id, category_name }
  owedByLiabilityId: {},
  status: 'idle',
};

const liabilitiesSlice = createSlice({
  name: 'liabilities',
  initialState,
  reducers: {
    reset() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadLiabilities.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadLiabilities.fulfilled, (state, action) => {
        state.status = 'idle';
        state.items = action.payload.rows;
        state.owedByLiabilityId = action.payload.owed;
      })
      .addCase(addLiability.fulfilled, (state, action) => {
        state.items.unshift({
          id: action.payload.id,
          name: action.payload.name,
          reason: action.payload.reason,
          principal_amount: action.payload.principal_amount,
          category_id: action.payload.category_id,
          category_name: action.payload.name,
        });
        state.owedByLiabilityId[action.payload.id] = action.payload.principal_amount;
      })
      .addCase(removeLiability.fulfilled, (state, action) => {
        state.items = state.items.filter((l) => l.id !== action.payload);
        delete state.owedByLiabilityId[action.payload];
      })
      .addCase(repayLiability.fulfilled, (state, action) => {
        state.owedByLiabilityId = action.payload.owed;
      });
  },
});

export const selectTotalOwed = (state) =>
  Object.values(state.liabilities.owedByLiabilityId).reduce((sum, v) => sum + Number(v || 0), 0);

export const { reset: resetLiabilities } = liabilitiesSlice.actions;
export default liabilitiesSlice.reducer;
