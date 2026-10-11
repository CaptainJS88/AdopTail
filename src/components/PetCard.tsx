import type { Pet } from '../data/pets';

export default function PetCard({ pet }: { pet: Pet }) {
  return (
    <article className="pet-card">
      <div className="pet-card-content">
        <h3>{pet.name}</h3>
        <p className="pet-details">{pet.details}</p>
      </div>
    </article>
  );
}
