import { useState } from 'react';
import PetCard from '../components/PetCard';
import { pets } from '../data/pets';

export default function FindPet() {
  const [search, setSearch] = useState('');
  const filteredPets = pets.filter((pet) =>
    `${pet.name} ${pet.details}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <section className="section container" aria-labelledby="search-title">
      <div className="section-heading">
        <h1 id="search-title">Search for a Pet</h1>
        <span className="sample-label">Sample pet profiles</span>
      </div>
      <p className="hero-description">Step 1 of 3: choose a pet, fill out an application, then request a visit.</p>
      <div className="field">
        <label htmlFor="search">Search pets</label>
        <input id="search" type="search" value={search}
          onChange={(event) => setSearch(event.target.value)} placeholder="Name or pet details" />
      </div>
      <div className="pet-grid">
        {filteredPets.map((pet) => <PetCard key={pet.id} pet={pet} showApply />)}
      </div>
      {filteredPets.length === 0 && <p>No pets match your search.</p>}
    </section>
  );
}
