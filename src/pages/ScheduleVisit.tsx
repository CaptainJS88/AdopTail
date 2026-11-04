import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PetLoadState from '../components/PetLoadState';
import { useAuth } from '../auth/AuthContext';
import { usePets } from '../hooks/usePets';
import { supabase } from '../lib/supabase';

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
    const startsAt = new Date(`${chooseDate}T${chooseTime}`).toISOString();
    const { error: rpcError } = await supabase.rpc('submit_appointment_request', {
      p_animal_id: pet.id,
      p_starts_at: startsAt,
    });
    setSubmitting(false);
    if (rpcError) setSubmitError(rpcError.message);
    else setMessage('Visit request sent. The shelter will confirm the appointment.');
  }

  if (loading || error) return <section className="section container"><PetLoadState loading={loading} error={error} /></section>;
  if (!pet) return <section className="section container"><h1>Choose a pet first</h1><Link className="button" to="/pets">Find a pet</Link></section>;
  if (authLoading) return <section className="section container"><p role="status">Checking your session…</p></section>;
  if (!session) return (
    <section className="section container">
      <h1>Visit {pet.name}</h1>
      <p className="hero-description">Sign in or create an adopter account before requesting a visit.</p>
      <Link className="button" to={`/account?next=${encodeURIComponent(`/visit?pet=${pet.id}`)}`}>Sign in or create account</Link>
    </section>
  );

  return (
    <section className="section container" aria-labelledby="visit-title">
      <div className="section-heading"><h1 id="visit-title">Visit {pet.name}</h1><span className="sample-label">Visit request</span></div>
      <p className="hero-description">Choose a preferred date and time. The shelter will confirm availability.</p>
      {submitError && <p role="alert">Unable to request visit: {submitError}</p>}
      {message && <p role="status">{message}</p>}
      <form onSubmit={handleSubmit}>
        <div className="field"><label htmlFor="chooseDate">Preferred date</label><input id="chooseDate" type="date" required min={minimumDate} value={chooseDate} onChange={(event) => setChooseDate(event.target.value)} /></div>
        <div className="field"><label htmlFor="chooseTime">Preferred time</label><input id="chooseTime" type="time" required value={chooseTime} onChange={(event) => setChooseTime(event.target.value)} /></div>
        <button className="button" type="submit" disabled={submitting}>{submitting ? 'Sending…' : 'Request visit'}</button>
      </form>
    </section>
  );
}
