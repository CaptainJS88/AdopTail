import { Link } from 'react-router-dom';
import { Clock, MapPin, Mail, Phone } from 'lucide-react';
import { shelter, formatTime } from '../data/shelter';

export default function About() {
  return (
    <section className="section container" aria-labelledby="about-title">
      <div className="about-intro">
        <div className="page-heading">
          <h1 id="about-title">About us</h1>
          <p>Adoptail connects people with pets looking for a home.</p>
        </div>
        <img
          className="about-photo"
          src="/shelter-about.png"
          alt="A shelter worker caring for dogs outside their kennels"
          width="1350"
          height="756"
        />
      </div>

      <div className="about-content">
        <div className="about-story">
          <section aria-labelledby="before-visit-title">
            <h2 id="before-visit-title">Visiting the shelter</h2>
            <ul>
              <li>Choose a pet you would like to meet.</li>
              <li>Request a time from their details page.</li>
              <li>Wait for the shelter to confirm your visit.</li>
            </ul>
            <Link className="text-link" to="/pets">Browse our pets</Link>
          </section>
        </div>

        <aside className="shelter-info" aria-labelledby="shelter-info-title">
          <h2 id="shelter-info-title">Plan your visit</h2>
          <h3><Clock size={18} aria-hidden="true" /> Visiting hours</h3>
          <dl className="shelter-hours">
            {shelter.hours.map((hours) => (
              <div key={hours.days}>
                <dt>{hours.days}</dt>
                <dd>{hours.open ? `${formatTime(hours.open)} to ${formatTime(hours.close)}` : 'Closed'}</dd>
              </div>
            ))}
          </dl>
          <p className="shelter-timezone">All times are Central Time.</p>
          <h3>Location and contact</h3>
          <dl className="shelter-contact">
            <div>
              <dt><MapPin size={18} aria-hidden="true" /> Location</dt>
              <dd>{shelter.location}</dd>
            </div>
            <div>
              <dt><Mail size={18} aria-hidden="true" /> Email</dt>
              <dd>{shelter.email}</dd>
            </div>
            <div>
              <dt><Phone size={18} aria-hidden="true" /> Phone</dt>
              <dd>{shelter.phone}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </section>
  );
}
