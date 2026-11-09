import { useState } from 'react';
import PetCard from '../components/PetCard';
import PetLoadState from '../components/PetLoadState';
import { usePets } from '../hooks/usePets';
import Message from '../components/Message';

export default function FindPet() {
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [availability, setAvailability] = useState('');
  const { pets, loading, error } = usePets();
  const query = search.trim().toLowerCase();
  const speciesOptions = [...new Set(pets.map((pet) => pet.species))].sort();
  const breedOptions = [
    ...new Set(
      pets
        .filter((pet) => !species || pet.species === species)
        .map((pet) => pet.breed)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();

  const filteredPets = pets.filter((pet) => {
    const matchesSearch =
      `${pet.name} ${pet.species} ${pet.details} ${pet.description}`
        .toLowerCase()
        .includes(query);
    const matchesSpecies = !species || pet.species === species;
    const matchesBreed = !breed || pet.breed === breed;
    const matchesAvailability =
      !availability || pet.adoptionStatus === availability;
    const months = pet.ageMonths;
    const matchesAge =
      !age ||
      (months !== null &&
        ((age === 'under1' && months < 12) ||
          (age === '1to2' && months >= 12 && months < 36) ||
          (age === '3to6' && months >= 36 && months < 84) ||
          (age === '7plus' && months >= 84)));
    return (
      matchesSearch &&
      matchesSpecies &&
      matchesBreed &&
      matchesAge &&
      matchesAvailability
    );
  });

  function clearFilters() {
    setSearch('');
    setSpecies('');
    setBreed('');
    setAge('');
    setAvailability('');
  }

  return (
    <section className="section container" aria-labelledby="search-title">
      <div className="section-heading">
        <h1 id="search-title">Find a pet</h1>
        <span className="sample-label">Shelter listings</span>
      </div>
      <p className="hero-description">
        View a pet's details to apply or request a visit.
      </p>
      <div className="search-filters">
        <div className="field search-field">
          <label htmlFor="search">Search pets</label>
          <input
            id="search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or pet details"
          />
        </div>
        <div className="field">
          <label htmlFor="species">Species</label>
          <select
            id="species"
            value={species}
            onChange={(event) => {
              setSpecies(event.target.value);
              setBreed('');
            }}
          >
            <option value="">All species</option>
            {speciesOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="breed">Breed</label>
          <select
            id="breed"
            value={breed}
            onChange={(event) => setBreed(event.target.value)}
          >
            <option value="">All breeds</option>
            {breedOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="age">Age</label>
          <select
            id="age"
            value={age}
            onChange={(event) => setAge(event.target.value)}
          >
            <option value="">All ages</option>
            <option value="under1">Under 1 year</option>
            <option value="1to2">1 to 2 years</option>
            <option value="3to6">3 to 6 years</option>
            <option value="7plus">7 years and older</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="availability">Availability</label>
          <select
            id="availability"
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
          >
            <option value="">All statuses</option>
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="fostered">Fostered</option>
            <option value="adopted">Adopted</option>
          </select>
        </div>
      </div>
      <PetLoadState loading={loading} error={error} />
      {!loading && !error && (
        <>
          <div className="filter-summary">
            <p role="status">
              {filteredPets.length} {filteredPets.length === 1 ? 'pet' : 'pets'}{' '}
              found
            </p>
            <button
              className="text-button"
              type="button"
              onClick={clearFilters}
              disabled={!search && !species && !breed && !age && !availability}
            >
              Clear filters
            </button>
          </div>
          <div className="pet-grid">
            {filteredPets.map((pet) => (
              <PetCard key={pet.id} pet={pet} />
            ))}
          </div>
          {filteredPets.length === 0 && (
            <Message>
              No pets match these filters. Try changing a filter or clearing
              your search.
            </Message>
          )}
        </>
      )}
    </section>
  );
}
