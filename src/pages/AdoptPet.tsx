import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PetLoadState from '../components/PetLoadState';
import { useAuth } from '../auth/AuthContext';
import { usePets } from '../hooks/usePets';
import { supabase } from '../lib/supabase';
import Message from '../components/Message';
import { requestError } from '../lib/messages';

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
    try {
      const { error: rpcError } = await supabase.rpc(
        'submit_adoption_application',
        {
          p_animal_id: pet.id,
          p_reason: String(form.get('reason')).trim(),
        },
      );
      if (rpcError) throw rpcError;
      else navigate('/applications');
    } catch (cause) {
      setSubmitError(
        requestError(
          cause,
          'We could not submit your application. Please try again.',
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
            <p>Browse the listings to start an application.</p>
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
            <h1>Apply for {pet.name}</h1>
            <p>{pet.details}</p>
          </div>
          <Message>
            Sign in or create an account to apply for {pet.name}.
          </Message>
          <Link
            className="button"
            to={`/account?next=${encodeURIComponent(`/adopt?pet=${pet.id}`)}`}
          >
            Sign in or create account
          </Link>
        </div>
      </section>
    );

  return (
    <section className="section container" aria-labelledby="application-title">
      <div className="page-content form-content">
        <div className="page-heading">
          <h1 id="application-title">Apply for {pet.name}</h1>
          <p>Tell the shelter why you would be a good match.</p>
        </div>
        <Message>
          Your application will be sent to the shelter for review.
        </Message>
        {submitError && <Message kind="error">{submitError}</Message>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="reason">
              Why would you like to adopt {pet.name}?
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={5}
              required
              minLength={1}
              maxLength={2000}
            />
          </div>
          <button className="button" type="submit" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit application'}
          </button>
        </form>
        <p className="form-footer">
          <Link className="text-link" to="/pets">
            Back to pets
          </Link>
        </p>
      </div>
    </section>
  );
}
