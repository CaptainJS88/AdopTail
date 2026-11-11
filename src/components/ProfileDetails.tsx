import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../auth/ProfileContext';
import { validateForm } from '../lib/validation';
import ContactFields from './ContactFields';
import Message from './Message';
import { requestError } from '../lib/messages';

export default function ProfileDetails({ accountAction }: { accountAction: ReactNode }) {
  const { session } = useAuth();
  const { details, loading, error: loadError, reload, updateDetails } = useProfile();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!session) return null;
  if (loading) return <Message kind="loading">Loading your profile...</Message>;
  if (loadError) return (
    <>
      <Message kind="error">{loadError}</Message>
      <div className="account-actions">
        <button className="button button-small button-secondary" type="button" onClick={reload}>Try again</button>
        {accountAction}
      </div>
    </>
  );

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateForm(event.currentTarget);
    if (validationError) return setError(validationError);
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setSaved(false);
    try {
      await updateDetails({
        fullName: String(form.get('fullName')).trim(),
        phone: String(form.get('phone')).replace(/\D/g, ''),
        city: String(form.get('city')).trim(),
      });
      setError('');
      setEditing(false);
      setSaved(true);
    } catch (cause) {
      setError(requestError(cause, 'We could not save your profile. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {error && !error.startsWith('Phone number:') && <Message kind="error">{error}</Message>}
      {saved && !editing && <Message kind="success">Your profile has been updated.</Message>}
      {editing ? (
        <form onSubmit={handleSave} aria-busy={saving} onChange={() => setError('')} noValidate>
          <fieldset className="form-section" disabled={saving}>
            <legend>Contact details</legend>
            <p className="form-intro">Fields marked with an asterisk are required. Your email comes from your account.</p>
            <ContactFields details={details} email={session.user.email || ''} formError={error} />
          </fieldset>
          <div className="form-actions">
            <button className="button" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</button>
            <button className="button button-secondary" type="button" disabled={saving} onClick={() => { setEditing(false); setError(''); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <section className="account-details" aria-labelledby="profile-contact-title">
            <h2 id="profile-contact-title">Contact details</h2>
            <dl className="account-fields">
              <div><dt>Full name:</dt><dd>{details.fullName || <span className="account-missing">Not added</span>}</dd></div>
              <div><dt>Email:</dt><dd>{session.user.email}</dd></div>
              <div><dt>Phone:</dt><dd>{details.phone || <span className="account-missing">Not added</span>}</dd></div>
              <div><dt>City:</dt><dd>{details.city || <span className="account-missing">Not added</span>}</dd></div>
            </dl>
          </section>
          <div className="account-actions">
            <button className="button button-secondary button-small" type="button" onClick={() => { setEditing(true); setSaved(false); }}>Edit profile</button>
            {accountAction}
          </div>
        </>
      )}
    </>
  );
}
