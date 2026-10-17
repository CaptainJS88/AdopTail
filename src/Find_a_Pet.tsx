import { ArrowRight, PawPrint, ClipboardList, House } from 'lucide-react';
import Header from './components/Header';
import PetCard from './components/PetCard';
import { pets } from './data/pets';
import { useState } from 'react';



export default function FindAPet() {
  const [search, setSearch] = useState (' ');
  const filteredPets = pets.filter((pet) => `${pet.name} ${pet.details}`.toLowerCase().includes(search.trim().toLowerCase()));

   return (
    <>
      <Header />
      <main id="main">
        <section id="Search" className="search container" aria-labelledby="search-title">
          <div className="section-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
            <h1 id="search-title">Search for a Pet</h1>
          </div>
          <input id="search" type="search" value={search} onChange={(event) => setSearch(event.target.value)}
          placeholder="Search" />
          {filteredPets.map((pet) => (<PetCard key={pet.id} pet={pet}/>))}
        </section>
      </main>
    </>
  );
}

