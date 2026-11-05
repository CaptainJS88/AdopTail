export function requestError(cause: unknown, fallback: string) {
  const message =
    cause && typeof cause === 'object' && 'message' in cause
      ? String(cause.message).toLowerCase()
      : '';

  if (message.includes('rate limit'))
    return 'Too many requests right now. Please wait a few minutes and try again.';
  if (message.includes('invalid login credentials'))
    return 'Your email or password is incorrect. Please try again.';
  if (message.includes('email not confirmed'))
    return 'Please confirm your email before signing in.';
  if (message.includes('already registered'))
    return 'An account with this email already exists. Please sign in.';
  if (
    message.includes('already have') ||
    message.includes('duplicate') ||
    message.includes('unique constraint')
  )
    return 'A request for this pet already exists. Please check your applications before trying again.';
  if (message.includes('not available'))
    return 'This pet is no longer available. Please choose another pet.';
  if (message.includes('fetch') || message.includes('network'))
    return 'We could not connect. Check your internet connection and try again.';
  return fallback;
}
