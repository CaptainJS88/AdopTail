import { Link } from 'react-router-dom';
import { Clock, MapPin, Mail, Phone } from 'lucide-react';
import { shelter, formatTime } from '../data/shelter';


export default function FAQ() {
    return (
        <section className="section container" aria-labelledby="FAQ-title">
            <div className="FAQ-intro">
                <div className="FAQ-left">
                    <div className="page-heading">
                        <h1 id="FAQ-title">Frequently Asked Questions</h1>
                    </div>

                <div className="FAQ-content FAQ-info">
                    <details>
                        <summary><h2>Adoption Process: How it Works</h2></summary>
                        <ul>
                            <li>Search for available pets on our website.</li>
                            <li>Once you've found your favorite pet, review their profile to make sure they are a good match for your family.</li>
                            <li>Get to know your pet before you adopt--schedule a visit with the shelter.</li>
                            <li>Ready to adopt? Submit your application for the pet you want to bring home.</li>
                            <li>Wait for us to review your application.</li>
                            <li>We'll let you know when your application is approved so you know when you can bring your new companion home!</li>
                            <li>Have questions? Let us know!</li>
                        </ul>
                    </details>

                    <details>
                        <summary><h2>Average wait time for Application Review</h2></summary>
                        <ul>
                            <li>Application review typically take 2-3 weeks.</li>
                            <li>If you do not hear from us within 3 weeks, please contact us.</li>
                        </ul>
                    </details>
                
                    <details>
                        <summary><h2>Adoption Fees</h2></summary>
                        <ul>
                            <li>The standard adoption fee is $50 per application.</li>
                        </ul>
                    </details>

                    <details>
                        <summary><h2>Do I need to have an appointment to visit a pet?</h2></summary>
                        <ul>
                            <li>No, appointments are not required, however those who have appointments to visit a specific pet will have priority.</li>
                        </ul>
                    </details>
                </div>
            </div>

            <img
                //image copyright: Olga Demina @Dreamstime
                className="FAQ-photo"
                src="/FAQ.png"
                alt="A curious puppy with a question"
                width="756"
                height="1350"
            />
        </div>

        <hr className="FAQ-divider" />

        <section className="section container" aria-labelledby="faq-title">
            <div className="page-heading">
                <h1 id="faq-title">Other Questions?</h1>
                <p>Visit us today or give us a call!</p>
            </div>
        </section>

        <aside className="shelter-info" aria-labelledby="shelter-info-title">
            <h2 id="shelter-info-title">Shelter Information</h2>
            <p className="demo-notice">Demo shelter details for this class project. Hours and contact information are examples.</p>
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

        </section>
    );
}