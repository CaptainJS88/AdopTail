import { ArrowRight, PawPrint, ClipboardList, House } from 'lucide-react';
import { Link } from 'react-router-dom';
import PetCard from '../components/PetCard';
import { pets } from '../data/pets';

const adoptionSteps = [
  { icon: PawPrint, title: 'Find a pet', text: 'Find a companion who fits your life.' },
  { icon: ClipboardList, title: 'Apply', text: 'Tell the shelter a little about yourself.' },
  { icon: House, title: 'Meet your companion', text: 'Arrange a visit with the shelter.' },
];

export default function Home() {
  return (
    <>
      <section id="home" className="hero" aria-labelledby="hero-title">
        <div className="container hero-content">
          <h1 id="hero-title">Adoptail</h1>
          <p className="hero-description">Find a friend. Give them a home.</p>
          <Link className="button" to="/pets">Find a pet <ArrowRight size={19} aria-hidden="true" /></Link>
        </div>
      </section>

      <section id="pets" className="section container" aria-labelledby="pets-title">
        <div className="section-heading">
          <div>
            <h2 id="pets-title">Meet the pets</h2>
          </div>
          <span className="sample-label">Sample pet profiles</span>
        </div>
        <div className="pet-grid">
          {pets.map((pet) => <PetCard key={pet.id} pet={pet} />)}
        </div>
      </section>

      <section id="how-it-works" className="steps-section" aria-labelledby="steps-title">
        <div className="container section">
          <h2 id="steps-title">How adoption works</h2>
          <div className="steps-grid">
            {adoptionSteps.map((step, index) => (
              <article className="adoption-step" key={step.title}>
                <div className="step-top"><step.icon size={26} aria-hidden="true" /><span>0{index + 1}</span></div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="container about-section" aria-labelledby="about-title">
        <h2 id="about-title">About Adoptail</h2>
        <p>Connecting shelter pets with a place to call home.</p>
      </section>

      <footer className="site-footer">
        <div className="container footer-content">
          <a className="brand" href="#home" aria-label="Adoptail home"><img src="/adoptail-logo.svg" alt="Adoptail" /></a>
          <a href="#home">Back to top <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </footer>
    </>
  );
}
