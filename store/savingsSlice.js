import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  getSavingsGoals,
  getTotalSavings,
  insertSavingsGoal,
  deleteSavingsGoal as dbDeleteSavingsGoal,
  depositToSavingsGoal,
} from '../db/schema';

export const loadSavings = createAsyncThunk('savings/load', async () => {
  const [goals, total] = await Promise.all([getSavingsGoals(), getTotalSavings()]);
  return { goals, total };
});

export const addSavingsGoal = createAsyncThunk('savings/addGoal', async ({ name, amount }) => {
  const id = await insertSavingsGoal({ name, amount: amount || 0 });
  return { id, name, is_default: 0, amount: amount || 0 };
});

export const removeSavingsGoal = createAsyncThunk('savings/removeGoal', async (id) => {
  await dbDeleteSavingsGoal(id);
  return id;
});

/** Deposits money into a savings goal, sourced only from currently-unallocated
 * baseline money — the caller is responsible for validating that amount is
 * available (see selectRemainingAllocatable in budgetSlice). */
export const depositToSavings = createAsyncThunk('savings/deposit', async ({ id, amount }) => {
  await depositToSavingsGoal(id, amount);
  return { id, amount };
});

const initialState = {
  goals: [], // [{ id, name, is_default, amount }]
  total: 0,
  status: 'idle',
};

const savingsSlice = createSlice({
  name: 'savings',
  initialState,
  reducers: {
    reset() {
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadSavings.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadSavings.fulfilled, (state, action) => {
        state.status = 'idle';
        state.goals = action.payload.goals;
        state.total = action.payload.total;
      })
      .addCase(addSavingsGoal.fulfilled, (state, action) => {
        state.goals.push(action.payload);
        state.total += action.payload.amount;
      })
      .addCase(removeSavingsGoal.fulfilled, (state, action) => {
        const removed = state.goals.find((g) => g.id === action.payload);
        state.goals = state.goals.filter((g) => g.id !== action.payload);
        if (removed) state.total -= removed.amount;
      })
      .addCase(depositToSavings.fulfilled, (state, action) => {
        const goal = state.goals.find((g) => g.id === action.payload.id);
        if (goal) goal.amount += action.payload.amount;
        state.total += action.payload.amount;
      });
  },
});

export const { reset: resetSavings } = savingsSlice.actions;
export default savingsSlice.reducer;
