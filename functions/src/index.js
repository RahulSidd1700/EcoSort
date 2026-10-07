// EcoSort Cloud Functions entry point.
// All privileged / server-validated operations live here so that the browser
// can never award points, change roles or skip status steps on its own.
// Global options (region, maxInstances) are set in helpers.js.
export { assignCollector, updatePickupStatus } from './handlers/pickups.js';
export { listingAction } from './handlers/listings.js';
export { updateComplaintStatus } from './handlers/complaints.js';
export { createCollectorAccount, setUserActive } from './handlers/admin.js';
