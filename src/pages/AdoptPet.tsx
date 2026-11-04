import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PetLoadState from '../components/PetLoadState';
import { useAuth } from '../auth/AuthContext';
import { usePets } from '../hooks/usePets';
import { supabase } from '../lib/supabase';

export default function AdoptPet() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { pets, loading, error } = usePets();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const pet = pets.find((item) => item.id === searchParams.get('pet'));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pet) return;
    setSubmitting(true);
    setSubmitError('');
    const form = new FormData(event.currentTarget);
    const { error: rpcError } = await supabase.rpc('submit_adoption_application', {
      p_animal_id: pet.id,
      p_reason: String(form.get('reason')).trim(),
    });
    setSubmitting(false);
    if (rpcError) setSubmitError(rpcError.message);
    else navigate('/applications');
  }

  if (loading || error) return <section className="section container"><PetLoadState loading={loading} error={error} /></section>;
  if (!pet) return <section className="section container"><h1>Choose a pet first</h1><Link className="button" to="/pets">Find a pet</Link></section>;
  if (authLoading) return <section className="section container"><p role="status">Checking your session…</p></section>;
  if (!session) return (
    <section className="section container">
      <h1>Apply for {pet.name}</h1>
      <p className="hero-description">Sign in or create an adopter account before submitting an application.</p>
      <Link className="button" to={`/account?next=${encodeURIComponent(`/adopt?pet=${pet.id}`)}`}>Sign in or create account</Link>
    </section>
  );

  return (
    <section className="section container" aria-labelledby="application-title">
      <div className="section-heading"><h1 id="application-title">Apply for {pet.name}</h1><span className="sample-label">Adoption application</span></div>
      <p className="hero-description">Your application is submitted to the shelter for review.</p>
      {submitError && <p role="alert">Unable to submit application: {submitError}</p>}
      <form onSubmit={handleSubmit}>
        <div className="field"><label htmlFor="reason">Why would you like to adopt {pet.name}?</label><textarea id="reason" name="reason" rows={5} required minLength={1} maxLength={2000} /></div>
        <button className="button" type="submit" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit application'}</button>
      </form>
      <p className="hero-description"><Link to="/pets">Back to pets</Link></p>
    </section>
  );
}
