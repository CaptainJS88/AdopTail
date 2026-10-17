import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { pets } from '../data/pets';
import type { ApplicationDraft } from '../types';

interface AdoptPetProps {
  application: ApplicationDraft | null;
  onContinue: (application: ApplicationDraft) => void;
}

export default function AdoptPet({ application, onContinue }: AdoptPetProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pet = pets.find((pet) => pet.id === Number(searchParams.get('pet')));
  const draft = application?.petId === pet?.id ? application : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pet) return;

    // keep the form in this app for now, until the backend is connected
    const form = new FormData(event.currentTarget);
    onContinue({
      petId: pet.id,
      fullName: String(form.get('fullName')).trim(),
      email: String(form.get('email')).trim(),
      phone: String(form.get('phone')).trim(),
      home: String(form.get('home')),
      experience: String(form.get('experience')).trim(),
    });
    navigate(`/visit?pet=${pet.id}`);
  }

  if (!pet) {
    return (
      <section className="section container">
        <h1>Choose a pet first</h1>
        <p className="hero-description">Find a pet you would like to apply for.</p>
        <Link className="button" to="/pets">Find a pet</Link>
      </section>
    );
  }

  return (
    <section className="section container" aria-labelledby="application-title">
      <div className="section-heading">
        <h1 id="application-title">Apply for {pet.name}</h1>
        <span className="sample-label">Step 2 of 3</span>
      </div>
      <p className="hero-description">Demo form. Nothing is sent to a shelter. Use sample details.</p>
      <form key={pet.id} onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="fullName">Full name</label>
          <input id="fullName" name="fullName" autoComplete="name" required maxLength={100} defaultValue={draft?.fullName} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={draft?.email} />
        </div>
        <div className="field">
          <label htmlFor="phone">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={30} defaultValue={draft?.phone} />
        </div>
        <div className="field">
          <label htmlFor="home">Home type</label>
          <select id="home" name="home" required defaultValue={draft?.home ?? ''}>
            <option value="">Choose a home type</option>
            <option value="house">House</option>
            <option value="apartment">Apartment</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="experience">Tell us about your experience caring for pets</label>
          <textarea id="experience" name="experience" rows={4} required maxLength={2000} defaultValue={draft?.experience} />
        </div>
        <button className="button" type="submit">Continue to scheduling</button>
      </form>
      <p className="hero-description"><Link to="/pets">Back to pets</Link></p>
    </section>
  );
}
