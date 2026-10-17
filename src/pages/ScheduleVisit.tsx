import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { pets } from '../data/pets';
import type { ApplicationDraft } from '../types';

export default function ScheduleVisit({ application }: { application: ApplicationDraft | null }) {
  const [searchParams] = useSearchParams();
  const pet = pets.find((pet) => pet.id === Number(searchParams.get('pet')));
  const [chooseDate, setChooseDate] = useState('');
  const [chooseTime, setChooseTime] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const today = new Date();
  const minimumDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowPreview(true);
  }

  if (!pet || application?.petId !== pet.id) {
    return (
      <section className="section container">
        <h1>Start with an application</h1>
        <p className="hero-description">Choose a pet and complete the demo form before selecting a visit date. Refreshing clears the form.</p>
        <Link className="button" to={pet ? `/adopt?pet=${pet.id}` : '/pets'}>
          {pet ? `Apply for ${pet.name}` : 'Find a pet'}
        </Link>
      </section>
    );
  }

  return (
    <section className="section container" aria-labelledby="visit-title">
      <div className="section-heading">
        <h1 id="visit-title">Visit {pet.name}</h1>
        <span className="sample-label">Step 3 of 3</span>
      </div>
      <p className="hero-description">Choose a preferred date and time. The shelter will need to confirm availability.</p>
      <p className="hero-description">Demo only. Your application and visit request are not submitted.</p>
      <form onSubmit={handleSubmit} onChange={() => setShowPreview(false)}>
        <div className="field">
          <label htmlFor="chooseDate">Preferred date</label>
          <input id="chooseDate" type="date" required min={minimumDate} value={chooseDate}
            onChange={(event) => setChooseDate(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="chooseTime">Preferred time</label>
          <input id="chooseTime" type="time" required value={chooseTime}
            onChange={(event) => setChooseTime(event.target.value)} />
        </div>
        <button className="button" type="submit">Preview visit request</button>
      </form>
      {showPreview && (
        <p className="hero-description" role="status">
          Preview: visit {pet.name} on {chooseDate} at {chooseTime}. Nothing has been sent or booked.
        </p>
      )}
      <p className="hero-description"><Link to={`/adopt?pet=${pet.id}`}>Back to application</Link></p>
    </section>
  );
}
