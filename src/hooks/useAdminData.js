import { useRealtime } from './useRealtime';
import { subscribeUsers, subscribeCollectors } from '../services/adminService';
import { subscribeAllWaste } from '../services/wasteService';
import { subscribeAllPickups } from '../services/pickupService';
import { subscribeListings } from '../services/listingService';
import { subscribeAllComplaints } from '../services/complaintService';
import { subscribeAllRewards } from '../services/rewardService';

/**
 * Admin-only live data. Pass the collections you need, e.g. useAdminData(['users', 'pickups']).
 * Statistics are calculated from these queries instead of storing duplicate counters.
 */
export function useAdminData(needed = []) {
  const want = (k) => needed.includes(k);
  const users = useRealtime((ok, fail) => subscribeUsers(ok, fail), [], want('users'));
  const collectors = useRealtime((ok, fail) => subscribeCollectors(ok, fail), [], want('collectors'));
  const waste = useRealtime((ok, fail) => subscribeAllWaste(ok, fail), [], want('waste'));
  const pickups = useRealtime((ok, fail) => subscribeAllPickups(ok, fail), [], want('pickups'));
  const listings = useRealtime((ok, fail) => subscribeListings(ok, fail), [], want('listings'));
  const complaints = useRealtime((ok, fail) => subscribeAllComplaints(ok, fail), [], want('complaints'));
  const rewards = useRealtime((ok, fail) => subscribeAllRewards(ok, fail), [], want('rewards'));
  const all = [users, collectors, waste, pickups, listings, complaints, rewards];

  return {
    users: users.data,
    collectors: collectors.data,
    wasteItems: waste.data,
    pickups: pickups.data,
    listings: listings.data,
    complaints: complaints.data,
    rewards: rewards.data,
    loading: all.some((s) => s.loading),
    error: all.find((s) => s.error)?.error || '',
  };
}
