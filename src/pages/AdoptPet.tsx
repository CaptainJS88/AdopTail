import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PetLoadState from '../components/PetLoadState';
import { useAuth } from '../auth/AuthContext';
import { usePets } from '../hooks/usePets';
import Message from '../components/Message';
import { validateForm } from '../lib/validation';
import { useProfile } from '../auth/ProfileContext';
import type { ContactDetails } from '../auth/ProfileContext';
import ContactFields from '../components/ContactFields';
import FormReview from '../components/FormReview';

type ApplicationDraft = ContactDetails & {
  petId: string;
  housingType: string;
  homeOwnership: string;
  petPermission: string;
  household: string;
  otherPets: string;
  experience: string;
  dailyCare: string;
  reason: string;
};

export default function AdoptPet() {
  const [searchParams] = useSearchParams();
  const { session, loading: authLoading } = useAuth();
  const { details } = useProfile();
  const { pets, loading, error } = usePets();
  const [submitError, setSubmitError] = useState('');
  const [draft, setDraft] = useState<ApplicationDraft | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const pet = pets.find((item) => item.id === searchParams.get('pet'));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pet) return;
    const validationError = validateForm(event.currentTarget);
    if (validationError) {
      setSubmitError(validationError);
      return;
    }
    setSubmitError('');
    const form = new FormData(event.currentTarget);
    const value = (name: string) => String(form.get(name) || '').trim();
    setDraft({
      petId: pet.id,
      fullName: value('fullName'), phone: value('phone').replace(/\D/g, ''), city: value('city'),
      housingType: value('housingType'), homeOwnership: value('homeOwnership'),
      petPermission: value('petPermission'), household: value('household'),
      otherPets: value('otherPets'), experience: value('experience'),
      dailyCare: value('dailyCare'), reason: value('reason'),
    });
    setReviewing(true);
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

  if (pet.adoptionStatus !== 'available')
    return <section className="section container"><Message>{pet.name} is not accepting adoption applications right now.</Message><Link className="text-link" to={`/pets/${pet.id}`}>Back to pet details</Link></section>;

  const currentDraft = draft?.petId === pet.id ? draft : null;

  return (
    <section className="section container" aria-labelledby="application-title">
      <div className="page-content">
        <div className="page-heading">
          <h1 id="application-title">Apply for {pet.name}</h1>
          <p>Tell the shelter about yourself and the home you can offer.</p>
        </div>
        {submitError && !submitError.startsWith('Phone number:') && <Message kind="error">{submitError}</Message>}
        {reviewing && currentDraft ? (
          <FormReview title="Review your application" onEdit={() => setReviewing(false)} items={[
            { label: 'Pet', value: pet.name },
            { label: 'Full name', value: currentDraft.fullName },
            { label: 'Email', value: session.user.email || '' },
            { label: 'Phone', value: currentDraft.phone },
            { label: 'City', value: currentDraft.city },
            { label: 'Housing type', value: currentDraft.housingType },
            { label: 'Own or rent', value: currentDraft.homeOwnership },
            { label: 'Pets allowed', value: currentDraft.petPermission },
            { label: 'Household', value: currentDraft.household },
            { label: 'Other pets', value: currentDraft.otherPets },
            { label: 'Experience with pets', value: currentDraft.experience },
            { label: 'Daily care plan', value: currentDraft.dailyCare },
            { label: 'Reason for adopting', value: currentDraft.reason },
          ]} />
        ) : (
          <form key={pet.id} onSubmit={handleSubmit} onChange={() => setSubmitError('')} noValidate>
            <p className="form-intro">Fields marked with an asterisk are required. Other fields are marked optional.</p>
            <fieldset className="form-section">
              <legend>Contact details</legend>
              <ContactFields details={currentDraft || details} email={session.user.email || ''} formError={submitError} />
            </fieldset>
            <fieldset className="form-section">
              <legend>Your home</legend>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="housingType">Housing type <span className="required-mark" aria-hidden="true">*</span></label>
                  <select id="housingType" name="housingType" required defaultValue={currentDraft?.housingType || ''}>
                    <option value="">Choose a housing type</option><option value = "house">House</option><option value = "apartment">Apartment</option><option value = "other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="homeOwnership">Do you own or rent? <span className="required-mark" aria-hidden="true">*</span></label>
                  <select id="homeOwnership" name="homeOwnership" required defaultValue={currentDraft?.homeOwnership || ''}>
                    <option value="">Choose an option</option><option value="own">Own</option><option value ="rent">Rent</option><option value ="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="petPermission">Are pets allowed where you live? <span className="required-mark" aria-hidden="true">*</span></label>
                <select id="petPermission" name="petPermission" required defaultValue={currentDraft?.petPermission || ''}>
                  <option value="">Choose an option</option><option value="yes">Yes</option><option value = "no">No</option><option value = "need_to_check">Need to check</option>
                </select>
                <p className="input-hint">If you rent, check your landlord's pet policy.</p>
              </div>
              <div className="field">
                <label htmlFor="household">Who will share the home? (optional)</label>
                <textarea id="household" name="household" rows={3} maxLength={500} defaultValue={currentDraft?.household || ''} aria-describedby="household-hint" />
                <p className="input-hint" id="household-hint">For example, two adults and one child. Please leave out names.</p>
              </div>
            </fieldset>
            <fieldset className="form-section">
              <legend>Life with your pet</legend>
              <div className="field">
                <label htmlFor="otherPets">Do you currently have other pets? <span className="required-mark" aria-hidden="true">*</span></label>
                <textarea id="otherPets" name="otherPets" rows={3} required maxLength={500} defaultValue={currentDraft?.otherPets || ''} placeholder="Tell us about them, or write None." />
              </div>
              <div className="field">
                <label htmlFor="experience">Experience with pets (optional)</label>
                <textarea id="experience" name="experience" rows={3} maxLength={1000} defaultValue={currentDraft?.experience || ''} placeholder="First-time adopters are welcome too." />
              </div>
              <div className="field">
                <label htmlFor="dailyCare">How will you manage daily care? <span className="required-mark" aria-hidden="true">*</span></label>
                <textarea id="dailyCare" name="dailyCare" rows={3} required maxLength={1000} defaultValue={currentDraft?.dailyCare || ''} placeholder="Think about feeding, exercise and time at home." />
              </div>
              <div className="field">
                <label htmlFor="reason">Why would you like to adopt {pet.name}? <span className="required-mark" aria-hidden="true">*</span></label>
                <textarea id="reason" name="reason" rows={4} required maxLength={2000} defaultValue={currentDraft?.reason || ''} />
              </div>
            </fieldset>
            <button className="button" type="submit">Review application</button>
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
