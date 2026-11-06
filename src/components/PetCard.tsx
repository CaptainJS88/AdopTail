import { Link } from 'react-router-dom';
import type { Pet } from '../data/pets';

export default function PetCard({ pet }: { pet: Pet }) {
  return (
    <article className="pet-card">
      {pet.photoUrl && (
        <img
          className="pet-card-photo"
          src={pet.photoUrl}
          alt={`${pet.name}, ${pet.breed || pet.species}`}
          loading="lazy"
          width="600"
          height="450"
        />
      )}
      <div className="pet-card-content">
        <h3>{pet.name}</h3>
        <p className="pet-details">{pet.details}</p>
        <div className="pet-actions">
          <Link
            className="text-link"
            to={`/pets/${pet.id}`}
            aria-label={`View details about ${pet.name}`}
          >
            View details
          </Link>
        </div>
      </div>
    </article>
  );
}
