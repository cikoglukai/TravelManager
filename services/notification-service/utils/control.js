// Control state for the notification consumers.
export const control = {
  alert: { processed: 0, sent: 0, errors: 0, lastMessageAt: null, subscriberUp: false },
  newsletter: { processed: 0, sent: 0, errors: 0, lastMessageAt: null, subscriberUp: false },
}
