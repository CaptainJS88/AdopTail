import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

export default function Account() {
  const { session, loading, signOut } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const next = searchParams.get('next') || '/pets';
  const destination = next.startsWith('/') && !next.startsWith('//') ? next : '/pets';

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
          const { error: profileError } = await supabase.from('profiles')
            .update({ display_name: displayName }).eq('id', data.user.id);
          if (profileError) throw profileError;
          navigate(destination);
        } else {
          setMessage('Account created. Check your email to confirm the account, then sign in.');
          setMode('signin');
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        navigate(destination);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Account request failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setError('');
    try { await signOut(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign out.'); }
  }

  if (loading) return <section className="section container"><p role="status">Checking your session…</p></section>;

  if (session) {
    return (
      <section className="section container" aria-labelledby="account-title">
        <h1 id="account-title">Your account</h1>
        <p>Signed in as {session.user.email}</p>
        {error && <p role="alert">{error}</p>}
        <p><Link to="/applications">View your applications</Link></p>
        <button className="button" type="button" onClick={handleSignOut}>Sign out</button>
      </section>
    );
  }

  return (
    <section className="section container" aria-labelledby="account-title">
      <h1 id="account-title">{mode === 'signup' ? 'Create adopter account' : 'Sign in'}</h1>
      <p className="hero-description">An adopter account is required to submit applications and visit requests.</p>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      <form onSubmit={handleSubmit}>
        {mode === 'signup' && <div className="field"><label htmlFor="displayName">Full name</label><input id="displayName" name="displayName" autoComplete="name" required maxLength={100} /></div>}
        <div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" autoComplete="email" required maxLength={254} /></div>
        <div className="field"><label htmlFor="password">Password</label><input id="password" name="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required minLength={8} /></div>
        <button className="button" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      </form>
      <p className="hero-description">
        {mode === 'signup' ? 'Already have an account? ' : 'New to Adoptail? '}
        <button type="button" className="text-button" onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setMessage(''); }}>
          {mode === 'signup' ? 'Sign in' : 'Create an account'}
        </button>
      </p>
    </section>
  );
}
