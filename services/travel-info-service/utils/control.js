// Workflow control state for the async pollers. Exposed via /api/control so the
// travel-warning / weather workflows can be monitored and paused/resumed — the
// "control mechanism" the assignment requires for async workloads.
export const control = {
  warnings: { lastRun: null, lastDurationMs: null, processed: 0, alertsRaised: 0, errors: 0, paused: false },
  weather:  { lastRun: null, lastDurationMs: null, processed: 0, errors: 0, paused: false },
}
