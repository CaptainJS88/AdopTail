import { ArrowRight, PawPrint, ClipboardList, House, AlignCenter } from 'lucide-react';
import Header from './components/Header';
import PetCard from './components/PetCard';
import { pets } from './data/pets';
import {useState} from 'react';



export default function ScheduleAVisit() {
    const [choosePet, setChoosePet] = useState('');
    const chosenPet = pets.filter((pet) => String(pet.name) == choosePet);
    const [chooseDate, setChooseDate] = useState('');
    return (
    <>
        <Header />
        <main id="main">
        <section id="Apply" className="hero" aria-labelledby="hero-title">
            <div className="container hero-content">
            <h1 id="hero-title">Visit a Pet</h1>
            <p className="hero-description">Schedule a visit!</p>
            <select id="choosePet" value={choosePet} onChange={(event) => setChoosePet(event.target.value)}>
                <option value="">Choose a Pet</option>{pets.map((pet) => (<option key={pet.id} value={pet.name}>{pet.name}</option>))}
            </select>
            {choosePet && (<div>
                <label htmlFor="chooseDate">When do you want to visit {choosePet} </label>
                <input id="chooseDate" type="date" value={chooseDate} onChange={(event) => setChooseDate(event.target.value)}/></div>)}
            </div>
        </section>
     </main>
     </>
  );
}
