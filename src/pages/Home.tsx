import { ArrowRight, PawPrint, ClipboardList, House } from 'lucide-react';
import { Link } from 'react-router-dom';
import PetCard from '../components/PetCard';
import PetLoadState from '../components/PetLoadState';
import { usePets } from '../hooks/usePets';
import Message from '../components/Message';

const adoptionSteps = [
  { icon: PawPrint, title: 'Find a pet', text: 'Find a companion who fits your life.' },
  { icon: ClipboardList, title: 'View their details', text: 'Learn about their personality and care needs.' },
  { icon: House, title: 'Take the next step', text: 'Apply to adopt or request a visit.' },
];

export default function Home() {
  const { pets, loading, error } = usePets();

  return (
    <>
      <section id="home" className="hero" aria-labelledby="hero-title">
        <div className="container hero-content">
          <h1 id="hero-title">Find a friend.<br />Give them a home.</h1>
          <p className="hero-description">Choose a pet, get to know them, and apply when you're ready.</p>
          <Link className="button" to="/pets">Start adoption <ArrowRight size={19} aria-hidden="true" /></Link>
        </div>
      </section>

      <section id="pets" className="section container" aria-labelledby="pets-title">
        <div className="section-heading">
          <div><h2 id="pets-title">Meet the pets</h2></div>
          <Link className="text-link" to="/pets">
            See all pets <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <PetLoadState loading={loading} error={error} />
        {!loading && !error && pets.length === 0 && <Message>No pets are listed right now. Please check back soon.</Message>}
        {!loading && !error && (
          <div className="pet-grid">
            {pets.slice(0, 3).map((pet) => <PetCard key={pet.id} pet={pet} />)}
          </div>
        )}
      </section>

      <section id="how-it-works" className="steps-section" aria-labelledby="steps-title">
        <div className="container section">
          <h2 id="steps-title">How adoption works</h2>
          <ol className="steps-grid">
            {adoptionSteps.map((step, index) => (
              <li className="adoption-step" key={step.title}>
                <div className="step-top"><span aria-hidden="true">0{index + 1}</span><step.icon size={26} aria-hidden="true" /></div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

    </>
  );
}
