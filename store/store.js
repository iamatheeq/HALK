import { configureStore } from '@reduxjs/toolkit';
import budgetReducer from './budgetSlice';
import usersReducer from './usersSlice';
import liabilitiesReducer from './liabilitiesSlice';
import transactionsReducer from './transactionsSlice';
import savingsReducer from './savingsSlice';

export const store = configureStore({
  reducer: {
    budget: budgetReducer,
    users: usersReducer,
    liabilities: liabilitiesReducer,
    transactions: transactionsReducer,
    savings: savingsReducer,
  },
});
