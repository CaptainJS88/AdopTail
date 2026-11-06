import { useState } from 'react';
import type { FormEvent } from 'react';
import { UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../auth/ProfileContext';
import { validateForm } from '../lib/validation';
import ContactFields from './ContactFields';
import Message from './Message';

export default function ProfileDetails() {
  const { session } = useAuth();
  const { details, updateDetails } = useProfile();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  if (!session) return null;

  function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateForm(event.currentTarget);
    if (validationError) return setError(validationError);
    const form = new FormData(event.currentTarget);
    updateDetails({
      fullName: String(form.get('fullName')).trim(),
      phone: String(form.get('phone')).replace(/\D/g, ''),
      city: String(form.get('city')).trim(),
    });
    setError('');
    setEditing(false);
  }

  return (
    <>
      {error && !error.startsWith('Phone number:') && <Message kind="error">{error}</Message>}
      {editing ? (
        <form onSubmit={handlePreview} onChange={() => setError('')} noValidate>
          <fieldset className="form-section">
            <legend>Contact details</legend>
            <p className="form-intro">Fields marked with an asterisk are required. Your email comes from your account.</p>
            <ContactFields details={details} email={session.user.email || ''} formError={error} />
          </fieldset>
          <div className="form-actions">
            <button className="button" type="submit">Update details</button>
            <button className="button button-secondary" type="button" onClick={() => { setEditing(false); setError(''); }}>Cancel</button>
          </div>
        </form>
      ) : (
        <>
          <div className="account-details">
            <span className="profile-icon"><UserRound size={24} aria-hidden="true" /></span>
            <div className="account-info">
              <h2>Contact details</h2>
              <dl className="account-fields">
                <div><dt>Full name</dt><dd>{details.fullName || 'Not added'}</dd></div>
                <div><dt>Email</dt><dd>{session.user.email}</dd></div>
                <div><dt>Phone</dt><dd>{details.phone || 'Not added'}</dd></div>
                <div><dt>City</dt><dd>{details.city || 'Not added'}</dd></div>
                <div><dt>Member since</dt><dd>{new Date(session.user.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</dd></div>
              </dl>
            </div>
          </div>
          <div className="account-actions">
            <button className="button button-small" type="button" onClick={() => setEditing(true)}>Edit profile</button>
          </div>
        </>
      )}
    </>
  );
}
