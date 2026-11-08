import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PetLoadState from '../components/PetLoadState';
import { useAuth } from '../auth/AuthContext';
import { usePets } from '../hooks/usePets';
import Message from '../components/Message';
import { validateForm } from '../lib/validation';
import { shelter, formatTime, getVisitingHours, getVisitTimes, getVisitDate, getVisitError } from '../data/shelter';
import { useProfile } from '../auth/ProfileContext';
import type { ContactDetails } from '../auth/ProfileContext';
import ContactFields from '../components/ContactFields';
import FormReview from '../components/FormReview';
import { supabase } from '../lib/supabase';
import { requestError } from '../lib/messages';

type VisitDraft = ContactDetails & { petId: string; date: string; time: string; note: string };

export default function ScheduleVisit() {
  const [searchParams] = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const { details } = useProfile();
  const { pets, loading, error } = usePets();
  const pet = pets.find((item) => item.id === searchParams.get('pet'));
  const [chooseDate, setChooseDate] = useState('');
  const [chooseTime, setChooseTime] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [draft, setDraft] = useState<VisitDraft | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const currentDraft = draft?.petId === pet?.id ? draft : null;
  const today = new Date();
  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(today);
  const minimumDate = ['year', 'month', 'day'].map((type) => dateParts.find((part) => part.type === type)?.value).join('-');
  const hours = getVisitingHours(chooseDate);
  const visitTimes = getVisitTimes(chooseDate);
  const dateError = !chooseDate ? ''
    : chooseDate < minimumDate ? 'This date has already passed. Please choose today or a future date.'
    : !hours?.open ? 'The shelter is closed on Sundays. Please choose Monday through Saturday.'
    : visitTimes.every((time) => getVisitDate(chooseDate, time) <= today)
      ? 'No visit times remain on this date. Please choose another day.' : '';

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pet) return;
    const validationError = dateError || validateForm(event.currentTarget) || getVisitError(chooseDate, chooseTime);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setSubmitError('');
    const form = new FormData(event.currentTarget);
    setDraft({
      petId: pet.id,
      fullName: String(form.get('fullName')).trim(),
      phone: String(form.get('phone')).replace(/\D/g, ''),
      city: details.city,
      date: chooseDate,
      time: chooseTime,
      note: String(form.get('note') || '').trim(),
    });
    setReviewing(true);
  }

  async function handleConfirm() {
    if (!pet || !currentDraft || submitting) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const { error: submitErrorResult } = await supabase.rpc('submit_appointment_request', {
        p_animal_id: pet.id,
        p_starts_at: getVisitDate(currentDraft.date, currentDraft.time).toISOString(),
        p_contact_details: {
          full_name: currentDraft.fullName,
          phone: currentDraft.phone,
          note: currentDraft.note,
        },
      });
      if (submitErrorResult) throw submitErrorResult;
      setRequestSent(true);
    } catch (cause) {
      setSubmitError(requestError(cause, 'Your visit request could not be submitted. Please review it and try again.'));
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
  if (!['available', 'pending'].includes(pet.adoptionStatus))
    return (
      <section className="section container">
        <div className="page-content">
          <div className="page-heading"><h1>Visit {pet.name}</h1></div>
          <Message>{pet.name} is not accepting visit requests right now. Please choose another pet.</Message>
          <Link className="text-link" to="/pets">Find a pet</Link>
        </div>
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

  const showReview = reviewing && currentDraft;

  return (
    <section className="section container" aria-labelledby="visit-title">
      <div className="page-content form-content">
        <div className="page-heading">
          <h1 id="visit-title">Visit {pet.name}</h1>
          <p>Choose a 30-minute visit during opening hours. All times are Central Time.</p>
        </div>
        {!showReview && (
          <div className="visit-hours">
            <h2>Visiting hours</h2>
            <dl className="shelter-hours">
              {shelter.hours.map((hours) => (
                <div key={hours.days}>
                  <dt>{hours.days}</dt>
                  <dd>{hours.open ? `${formatTime(hours.open)} to ${formatTime(hours.close)}` : 'Closed'}</dd>
                </div>
              ))}
            </dl>
            <p className="demo-notice">Demo hours. Visits must finish before closing.</p>
          </div>
        )}
        {requestSent && <Message kind="success">Your visit request was sent to the shelter. They will confirm or suggest another time.</Message>}
        {!requestSent && !showReview && dateError && <Message kind="error">{dateError}</Message>}
        {submitError && <Message kind="error">{submitError}</Message>}
        {requestSent ? (
          <div className="empty-state"><Link className="button button-secondary" to="/pets">Back to pets</Link></div>
        ) : showReview ? (
          <FormReview title="Review your visit request" onEdit={() => setReviewing(false)} onConfirm={handleConfirm} confirmLabel="Send visit request" busy={submitting} items={[
            { label: 'Pet', value: pet.name },
            { label: 'Full name', value: currentDraft.fullName },
            { label: 'Email', value: session.user.email || '' },
            { label: 'Phone', value: currentDraft.phone },
            { label: 'Preferred date', value: new Date(`${currentDraft.date}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: 'America/Chicago', month: 'long', day: 'numeric', year: 'numeric' }) },
            { label: 'Preferred time', value: `${formatTime(currentDraft.time)} Central Time` },
            { label: 'Visit length', value: '30 minutes' },
            { label: 'Questions for the shelter', value: currentDraft.note },
          ]} />
        ) : (
          <form key={pet.id} onSubmit={handleSubmit} onChange={() => setSubmitError('')} noValidate>
            <fieldset className="form-section">
              <legend>Contact details</legend>
              <p className="form-intro">Fields marked with an asterisk are required. Other fields are marked optional.</p>
              <ContactFields details={currentDraft || details} email={session.user.email || ''} includeCity={false} formError={submitError} />
            </fieldset>
            <fieldset className="form-section">
              <legend>Visit details</legend>
            <div className="field">
              <label htmlFor="chooseDate">Preferred date <span className="required-mark" aria-hidden="true">*</span></label>
              <input
                id="chooseDate"
                type="date"
                required
                min={minimumDate}
                value={chooseDate}
                aria-invalid={Boolean(dateError)}
                aria-describedby="visit-date-hint"
                onChange={(event) => {
                  setChooseDate(event.target.value);
                  setChooseTime('');
                  setSubmitError('');
                }}
              />
              <p className="input-hint" id="visit-date-hint">Open Monday through Saturday. Closed Sundays.</p>
            </div>
            <div className="field">
              <label htmlFor="chooseTime">Preferred time <span className="required-mark" aria-hidden="true">*</span></label>
              <select
                id="chooseTime"
                required
                value={chooseTime}
                disabled={!chooseDate || Boolean(dateError)}
                aria-describedby="visit-time-hint"
                onChange={(event) => {
                  setChooseTime(event.target.value);
                  setSubmitError('');
                }}
              >
                <option value="">{chooseDate ? 'Choose a time' : 'Choose a date first'}</option>
                {visitTimes.map((time) => (
                  <option key={time} value={time} disabled={getVisitDate(chooseDate, time) <= today}>
                    {formatTime(time)}
                  </option>
                ))}
              </select>
              <p className="input-hint" id="visit-time-hint">Only opening-hour times are shown. Times that have passed cannot be selected.</p>
            </div>
            <div className="field">
              <label htmlFor="visitNote">Questions for the shelter (optional)</label>
              <textarea id="visitNote" name="note" rows={3} maxLength={1000} defaultValue={currentDraft?.note || ''} />
            </div>
            </fieldset>
            <button className="button" type="submit" disabled={Boolean(dateError)}>Review visit request</button>
          </form>
        )}
        <p className="form-footer">
          <Link className="text-link" to={`/pets/${pet.id}`}>
            Back to {pet.name}'s details
          </Link>
        </p>
      </div>
    </section>
  );
}
