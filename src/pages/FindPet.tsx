import { useState } from 'react';
import PetCard from '../components/PetCard';
import PetLoadState from '../components/PetLoadState';
import { usePets } from '../hooks/usePets';

export default function FindPet() {
  const [search, setSearch] = useState('');
  const { pets, loading, error } = usePets();
  const query = search.trim().toLowerCase();
  const filteredPets = pets.filter((pet) =>
    `${pet.name} ${pet.details} ${pet.description}`.toLowerCase().includes(query)
  );

  return (
    <section className="section container" aria-labelledby="search-title">
      <div className="section-heading">
        <h1 id="search-title">Search for a Pet</h1>
        <span className="sample-label">Shelter listings</span>
      </div>
      <p className="hero-description">Step 1 of 3: choose a pet, fill out an application, then request a visit.</p>
      <div className="field">
        <label htmlFor="search">Search pets</label>
        <input id="search" type="search" value={search}
          onChange={(event) => setSearch(event.target.value)} placeholder="Name or pet details" />
      </div>
      <PetLoadState loading={loading} error={error} />
      {!loading && !error && (
        <>
          <div className="pet-grid">
            {filteredPets.map((pet) => <PetCard key={pet.id} pet={pet} showApply />)}
          </div>
          {filteredPets.length === 0 && <p>No pets match your search.</p>}
        </>
      )}
    </section>
  );
}
