/* 12000 → "12k", 1500 → "1.5k", 340 → "340".
   Shared by the brand social anchor and the influencer cards so both round the
   same way. Counts below SOCIAL_FOLLOWER_THRESHOLD should be hidden entirely
   rather than formatted — see `lib/config/brand`. */
export const formatFollowers = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`
