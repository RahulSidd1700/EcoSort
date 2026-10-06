// Converts Firebase error codes into friendly messages. Raw errors are only logged to the console.
const MESSAGES = {
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/user-disabled': 'This account has been deactivated. Please contact the administrator.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/invalid-login-credentials': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with this email already exists. Try logging in.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Please check your internet connection.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'Firebase is not configured. Please check the .env file.',
  'permission-denied': 'You do not have permission to perform this action.',
  unavailable: 'Service is temporarily unavailable. Please check your internet connection.',
  'not-found': 'The requested record was not found.',
  'storage/unauthorized': 'Unable to upload image. Please check the file type and size.',
  'storage/canceled': 'Upload was cancelled.',
  'storage/retry-limit-exceeded': 'Unable to upload image. Please try again.',
  'storage/unknown': 'Unable to upload image. Please try again.',
  'functions/unauthenticated': 'Please log in to continue.',
  'functions/internal': 'Something went wrong on the server. Please try again.',
};

export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  console.error(error);
  const code = error.code || '';
  // Cloud Functions HttpsError messages are written for end users.
  if (code.startsWith('functions/') && !['functions/internal', 'functions/unauthenticated'].includes(code)) {
    return error.message || fallback;
  }
  if (MESSAGES[code]) return MESSAGES[code];
  const short = code.replace(/^(firestore|functions|storage)\//, '');
  if (MESSAGES[short]) return MESSAGES[short];
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'Please check your internet connection.';
  return fallback;
}
