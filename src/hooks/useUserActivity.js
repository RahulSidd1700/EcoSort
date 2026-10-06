import { useRealtime } from './useRealtime';
import { subscribeUserWaste } from '../services/wasteService';
import { subscribeUserPickups } from '../services/pickupService';
import { subscribeMyListings } from '../services/listingService';
import { subscribeUserRewards } from '../services/rewardService';

/** Live waste records, pickups, listings and rewards for one user. */
export function useUserActivity(uid) {
  const waste = useRealtime((ok, fail) => subscribeUserWaste(uid, ok, fail), [uid]);
  const pickups = useRealtime((ok, fail) => subscribeUserPickups(uid, ok, fail), [uid]);
  const listings = useRealtime((ok, fail) => subscribeMyListings(uid, ok, fail), [uid]);
  const rewards = useRealtime((ok, fail) => subscribeUserRewards(uid, ok, fail), [uid]);

  return {
    wasteItems: waste.data,
    pickups: pickups.data,
    listings: listings.data,
    rewards: rewards.data,
    loading: waste.loading || pickups.loading || listings.loading || rewards.loading,
    error: waste.error || pickups.error || listings.error || rewards.error,
  };
}
