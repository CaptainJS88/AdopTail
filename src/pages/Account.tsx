import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';
import { LogOut, UserRound } from 'lucide-react';
import Message from '../components/Message';
import { requestError } from '../lib/messages';

export default function Account() {
  const { session, loading, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const next = searchParams.get('next') || '/pets';
  const destination =
    next.startsWith('/') && !next.startsWith('//') ? next : '/pets';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setError('');
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    const displayName = String(form.get('displayName') ?? '').trim();
    try {
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (authError) throw authError;
        if (data.session && data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ display_name: displayName })
            .eq('id', data.user.id);
          if (profileError) throw profileError;
          navigate(destination);
        } else {
          setMessage(
            'Account created. Check your email to confirm the account, then sign in.',
          );
          setMode('signin');
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        navigate(destination);
      }
    } catch (cause) {
      setError(
        requestError(
          cause,
          'We could not complete your account request. Please try again.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setError('');
    setBusy(true);
    try {
      await signOut();
      setMessage('You have been signed out.');
    } catch (cause) {
      setError(
        requestError(cause, 'We could not sign you out. Please try again.'),
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <section className="section container">
        <Message kind="loading">Checking your session...</Message>
      </section>
    );

  if (session) {
    const name = session.user.user_metadata.display_name;

    return (
      <section className="section container" aria-labelledby="account-title">
        <div className="page-content">
          <div className="page-heading">
            <h1 id="account-title">Your profile</h1>
          </div>
          {error && <Message kind="error">{error}</Message>}
          <div className="account-details">
            <span className="profile-icon">
              <UserRound size={24} aria-hidden="true" />
            </span>
            <div className="account-info">
              <h2>Account details</h2>
              <dl className="account-fields">
                {typeof name === 'string' && name.trim() && (
                  <div>
                    <dt>Name</dt>
                    <dd>{name}</dd>
                  </div>
                )}
                <div>
                  <dt>Email address</dt>
                  <dd>{session.user.email}</dd>
                </div>
                <div>
                  <dt>Member since</dt>
                  <dd>
                    {new Date(session.user.created_at).toLocaleDateString(
                      undefined,
                      { month: 'long', day: 'numeric', year: 'numeric' },
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="account-actions">
            <button
              className="button button-secondary button-small"
              type="button"
              disabled={busy}
              onClick={handleSignOut}
            >
              <LogOut size={16} aria-hidden="true" />
              {busy ? 'Signing out...' : 'Sign out'}
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section container" aria-labelledby="account-title">
      <div className="page-content form-content">
        <div className="page-heading">
          <h1 id="account-title">
            {mode === 'signup' ? 'Create an account' : 'Welcome back'}
          </h1>
          <p>
            {mode === 'signup'
              ? 'Join Adoptail to apply for a pet and request a visit.'
              : 'Sign in to view your applications and request a visit.'}
          </p>
        </div>
        {message && <Message kind="success">{message}</Message>}
        {error && <Message kind="error">{error}</Message>}
        <form onSubmit={handleSubmit} aria-busy={busy}>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="displayName">Full name</label>
              <input
                id="displayName"
                name="displayName"
                autoComplete="name"
                required
                maxLength={100}
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === 'signup' ? 'new-password' : 'current-password'
              }
              required
              minLength={8}
            />
          </div>
          {mode === 'signup' && (
            <p className="field-hint">
              Use at least 8 characters for your password.
            </p>
          )}
          <button className="button" type="submit" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>
        <p className="form-footer">
          {mode === 'signup'
            ? 'Already have an account? '
            : 'New to Adoptail? '}
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup');
              setError('');
              setMessage('');
            }}
          >
            {mode === 'signup' ? 'Sign in' : 'Create an account'}
          </button>
        </p>
      </div>
    </section>
  );
}
