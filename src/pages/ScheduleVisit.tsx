import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PetLoadState from '../components/PetLoadState';
import { useAuth } from '../auth/AuthContext';
import { usePets } from '../hooks/usePets';
import { supabase } from '../lib/supabase';
import Message from '../components/Message';
import { requestError } from '../lib/messages';

export default function ScheduleVisit() {
  const [searchParams] = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const { pets, loading, error } = usePets();
  const pet = pets.find((item) => item.id === searchParams.get('pet'));
  const [chooseDate, setChooseDate] = useState('');
  const [chooseTime, setChooseTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const today = new Date();
  const minimumDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pet) return;
    setSubmitting(true);
    setMessage('');
    setSubmitError('');
    try {
      const date = new Date(`${chooseDate}T${chooseTime}`);
      if (Number.isNaN(date.getTime()) || date <= new Date()) {
        setSubmitError('Choose a valid date and time in the future.');
        return;
      }
      const startsAt = date.toISOString();
      const { error: rpcError } = await supabase.rpc(
        'submit_appointment_request',
        {
          p_animal_id: pet.id,
          p_starts_at: startsAt,
        },
      );
      if (rpcError) throw rpcError;
      setMessage(
        'Your visit request has been sent. Please wait for the shelter to confirm your appointment.',
      );
    } catch (cause) {
      setSubmitError(
        requestError(
          cause,
          'We could not send your visit request. Please try again.',
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || error)
    return (
      <section className="section container">
        <PetLoadState loading={loading} error={error} />
      </section>
    );
  if (!pet)
    return (
      <section className="section container">
        <div className="page-content">
          <div className="page-heading">
            <h1>Choose a pet first</h1>
            <p>Select a pet before requesting a visit.</p>
          </div>
          <Link className="button" to="/pets">
            Find a pet
          </Link>
        </div>
      </section>
    );
  if (authLoading)
    return (
      <section className="section container">
        <Message kind="loading">Checking your session...</Message>
      </section>
    );
  if (!session)
    return (
      <section className="section container">
        <div className="page-content">
          <div className="page-heading">
            <h1>Visit {pet.name}</h1>
            <p>{pet.details}</p>
          </div>
          <Message>Sign in or create an account to request a visit.</Message>
          <Link
            className="button"
            to={`/account?next=${encodeURIComponent(`/visit?pet=${pet.id}`)}`}
          >
            Sign in or create account
          </Link>
        </div>
      </section>
    );

  return (
    <section className="section container" aria-labelledby="visit-title">
      <div className="page-content form-content">
        <div className="page-heading">
          <h1 id="visit-title">Visit {pet.name}</h1>
          <p>Choose a preferred date and time.</p>
        </div>
        {!message && (
          <Message>
            The shelter will review your request and confirm availability.
          </Message>
        )}
        {submitError && <Message kind="error">{submitError}</Message>}
        {message && <Message kind="success">{message}</Message>}
        {!message && (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="chooseDate">Preferred date</label>
              <input
                id="chooseDate"
                type="date"
                required
                min={minimumDate}
                value={chooseDate}
                onChange={(event) => setChooseDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="chooseTime">Preferred time</label>
              <input
                id="chooseTime"
                type="time"
                required
                value={chooseTime}
                onChange={(event) => setChooseTime(event.target.value)}
              />
            </div>
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? 'Sending…' : 'Request visit'}
            </button>
          </form>
        )}
        <p className="form-footer">
          <Link className="text-link" to="/applications">
            View your applications
          </Link>
        </p>
      </div>
    </section>
  );
}
