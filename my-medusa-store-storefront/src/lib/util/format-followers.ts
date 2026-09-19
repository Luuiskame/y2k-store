/* 1500000 → "1.5M", 12000 → "12k", 1500 → "1.5k", 340 → "340".
   Shared by the brand social anchor and the influencer cards so both round the
   same way. Counts below SOCIAL_FOLLOWER_THRESHOLD should be hidden entirely
   rather than formatted — see `lib/config/brand`. */
export const formatFollowers = (n: number) => {
  // Without the millions tier a 1.5M creator reads as "1500k".
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`
  }
  if (n >= 1000) {
    return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
  }
  return `${n}`
}
