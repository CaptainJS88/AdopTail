import { Link } from 'react-router-dom';


export default function FAQ() {
    return (
        <section className="section container" aria-labelledby="FAQ-title">
            <div className="FAQ-intro">
                <div className="FAQ-left">
                    <div className="page-heading">
                        <h1 id="FAQ-title">Frequently asked questions</h1>
                    </div>

                <div className="FAQ-content FAQ-info">
                    <details>
                        <summary><h2>How adoption works</h2></summary>
                        <ul>
                            <li>Search for available pets on our website.</li>
                            <li>Once you've found your favorite pet, review their profile to make sure they are a good match for your family.</li>
                            <li>You can request a visit from the pet’s details page before applying.</li>
                            <li>Ready to adopt? Submit your application for the pet you want to bring home.</li>
                            <li>Wait for us to review your application.</li>
                            <li>Check My applications for the shelter’s decision. Once approved, the shelter will arrange the next steps with you.</li>
                            <li>Have questions? Let us know!</li>
                        </ul>
                    </details>

                    <details>
                        <summary><h2>How long does application review take?</h2></summary>
                        <ul>
                            <li>Review times vary. Check My applications for the latest status.</li>
                            <li>Contact the shelter if you have a question about your application.</li>
                        </ul>
                    </details>

                    <details>
                        <summary><h2>Adoption fees</h2></summary>
                        <ul>
                            <li>Contact the shelter to confirm any adoption fees.</li>
                        </ul>
                    </details>

                    <details>
                        <summary><h2>Do I need to have an appointment to visit a pet?</h2></summary>
                        <ul>
                            <li>Choose Schedule a visit on the pet’s details page. Wait for the shelter to confirm, then check My visits for the latest date and time.</li>
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
