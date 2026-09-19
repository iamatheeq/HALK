import { resetBudget } from './budgetSlice';
import { resetLiabilities } from './liabilitiesSlice';
import { resetTransactions } from './transactionsSlice';
import { resetSavings } from './savingsSlice';

/** Clears every data slice's in-memory cache — dispatch this right before/after
 * switching the active user so the new account never flashes the previous one's data. */
export function resetAllUserData() {
  return (dispatch) => {
    dispatch(resetBudget());
    dispatch(resetLiabilities());
    dispatch(resetTransactions());
    dispatch(resetSavings());
  };
}
