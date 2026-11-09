import { Link } from 'react-router-dom';


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

        <section className="FAQ-contact" aria-labelledby="faq-title">
            <div className="page-heading">
                <h2 id="faq-title">Other questions?</h2>
                <p>Find our hours and contact details on the <Link className="text-link" to="/about">About us page</Link>.</p>
            </div>
        </section>



        </section>
    );
}
