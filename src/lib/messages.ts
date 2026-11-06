export function requestError(cause: unknown, fallback: string) {
  const message = typeof cause === 'string' ? cause.toLowerCase() :
    cause && typeof cause === 'object' && 'message' in cause
      ? String(cause.message).toLowerCase()
      : '';

  if (message.includes('rate limit'))
    return 'Too many requests right now. Please wait and try again later.';
  if (message.includes('invalid login credentials'))
    return 'Your email or password is incorrect. Please try again.';
  if (message.includes('email not confirmed'))
    return 'Please confirm your email before signing in.';
  if (message.includes('already registered'))
    return 'An account with this email already exists. Please sign in.';
  if (message.includes('adopter account is required'))
    return 'An adopter account is needed to apply or request a visit. Please sign in with an adopter account.';
  if (message.includes('approved staff access'))
    return 'This action is only available to approved shelter staff.';
  if (message.includes('jwt') || message.includes('session') || message.includes('refresh token'))
    return 'Your session has expired. Please sign in again and retry.';
  if (message.includes('overlaps') || message.includes('time conflict'))
    return 'This visit time is no longer available. Please choose another time.';
  if (message.includes('must be in the future'))
    return 'This time has already passed. Please choose a later date or time.';
  if (message.includes('not accepting visit') || message.includes('not available for a visit'))
    return 'This pet is not accepting visits right now. Please choose another pet.';
  if (message.includes('not currently accepting applications'))
    return 'This pet is not accepting adoption applications right now. Please choose another pet.';
  if (message.includes('adoption reason'))
    return 'Please explain why you would like to adopt this pet using 1 to 2,000 characters.';
  if (message.includes('weak password') || message.includes('password should'))
    return 'Please choose a stronger password with at least 8 characters.';
  if (message.includes('permission denied') || message.includes('row-level security'))
    return 'Your account does not have access to this information or action. Please check that you are signed in to the correct account.';
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
