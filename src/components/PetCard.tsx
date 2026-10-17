import { Link } from 'react-router-dom';
import type { Pet } from '../data/pets';

export default function PetCard({ pet, showApply = false }: { pet: Pet; showApply?: boolean }) {
  return (
    <article className="pet-card">
      <div className="pet-card-content">
        <h3>{pet.name}</h3>
        <p className="pet-details">{pet.details}</p>
        {showApply && (
          <Link className="button button-small" to={`/adopt?pet=${pet.id}`} aria-label={`Apply to adopt ${pet.name}`}>
            Apply
          </Link>
        )}
      </div>
    </article>
  );
}
