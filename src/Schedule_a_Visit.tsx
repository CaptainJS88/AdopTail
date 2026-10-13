import { ArrowRight, PawPrint, ClipboardList, House } from 'lucide-react';
import Header from './components/Header';
import PetCard from './components/PetCard';
import { pets } from './data/pets';

const adoptionSteps = [
  { icon: PawPrint, title: 'Find a pet', text: 'Find a companion who fits your life.' },
  { icon: ClipboardList, title: 'Apply', text: 'Tell the shelter a little about yourself.' },
  { icon: House, title: 'Meet your companion', text: 'Arrange a visit with the shelter.' },
];

export default function ScheduleAVisit() {
  return (
    <main>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <h1> Schedule a Visit</h1>
        {/* Schedule a Visit */}
    </main>
    </main>
  );
}
