// Control state for the feed consumer + newsletter job.
export const control = {
  feed: { processed: 0, lastMessageAt: null, subscriberUp: false },
  newsletter: { lastRun: null, usersNotified: 0, errors: 0 },
}
