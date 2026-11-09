import { formatStatus } from '../lib/status';
import PetPhoto from './PetPhoto';
import { Link } from 'react-router-dom';
import { formatAge } from '../data/pets';
import type { Pet } from '../data/pets';

export default function PetCard({ pet }: { pet: Pet }) {
  return (
    <article className="pet-card">
      {pet.photoUrl && (
        <PetPhoto
          petId={pet.id}
          className="pet-card-photo"
          src={pet.photoUrl}
          alt={`${pet.name}, ${pet.breed || pet.species}`}
          loading="lazy"
          width={600}
          height={450}
        />
      )}
      <div className="pet-card-content">
        <div className="pet-card-heading"><h3>{pet.name}</h3><span className={`pet-availability availability-${pet.adoptionStatus}`}>{formatStatus(pet.adoptionStatus === 'adopted' ? 'Adopted' : pet.adoptionStatus === 'pending' ? 'Application pending' : pet.adoptionStatus === 'fostered' ? 'In foster care' : 'Available')}</span></div>
        <p className="pet-details">Breed: {pet.breed || 'Not listed'}</p>
        <p className="pet-details">Age: {formatAge(pet.ageMonths) || 'Not listed'}</p>
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
