import { Link } from 'react-router-dom';
import { shelter, formatTime } from '../data/shelter';

export default function About() {
  return (
    <section className="section container about-page" aria-labelledby="about-title">
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

      <div className="about-content">
        <section className="about-story" aria-labelledby="before-visit-title">
          <h2 id="before-visit-title">Visiting the shelter</h2>
          <ul>
            <li>Choose a pet you would like to meet.</li>
            <li>Request a time from their details page.</li>
            <li>Wait for the shelter to confirm your visit.</li>
          </ul>
          <Link className="text-link" to="/pets">Browse our pets</Link>
        </section>

        <section className="shelter-info" aria-labelledby="hours-title">
          <h2 id="hours-title">Visiting hours</h2>
          <dl className="shelter-hours">
            {shelter.hours.map(hours => (
              <div key={hours.days}>
                <dt>{hours.days}</dt>
                <dd>{hours.open ? `${formatTime(hours.open)} to ${formatTime(hours.close)}` : 'Closed'}</dd>
              </div>
            ))}
          </dl>
          <p className="shelter-timezone">All times are Central Time.</p>
        </section>

        <section className="shelter-info" aria-labelledby="contact-title">
          <h2 id="contact-title">Location and contact</h2>
          <dl className="shelter-contact">
            <div><dt>Location:</dt><dd>{shelter.location}</dd></div>
            <div><dt>Email:</dt><dd>{shelter.email}</dd></div>
            <div><dt>Phone:</dt><dd>{shelter.phone}</dd></div>
          </dl>
        </section>
      </div>
    </section>
  );
}
