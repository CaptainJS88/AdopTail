import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { usePets } from '../hooks/usePets';
import { formatAge, getMedicalRecords } from '../data/pets';
import type { MedicalRecord } from '../data/pets';
import Message from '../components/Message';
import PetLoadState from '../components/PetLoadState';

export default function PetDetails() {
  const { id } = useParams();
  const { pets, loading, error } = usePets();
  const { session, loading: authLoading } = useAuth();
  const pet = pets.find((item) => item.id === id);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [medicalLoading, setMedicalLoading] = useState(true);
  const [medicalError, setMedicalError] = useState<string | null>(null);
  const petId = pet?.id;
  const userId = session?.user.id;

  useEffect(() => {
    let active = true;
    setRecords([]);
    setMedicalError(null);
    setMedicalLoading(true);
    if (!petId || !userId) return;

    getMedicalRecords(petId)
      .then((data) => {
        if (active) setRecords(data);
      })
      .catch(() => {
        if (active) setMedicalError('Medical records could not be loaded.');
      })
      .finally(() => {
        if (active) setMedicalLoading(false);
      });

    return () => {
      active = false;
    };
  }, [petId, userId]);

  if (loading || error)
    return (
      <section className="section container">
        <PetLoadState loading={loading} error={error} />
      </section>
    );

  if (!pet)
    return (
      <section className="section container">
        <div className="page-heading">
          <h1>Pet not found</h1>
          <p>This listing is no longer available or the link is incorrect.</p>
        </div>
        <Link className="button" to="/pets">
          Find a pet
        </Link>
      </section>
    );

  return (
    <section className="section container" aria-labelledby="pet-title">
      <div className="pet-detail-page">
        <Link className="text-link" to="/pets">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to pets
        </Link>
        <div className={pet.photoUrl ? 'pet-detail-layout' : 'pet-detail-layout no-photo'}>
          {pet.photoUrl && (
            <img
              className="pet-detail-photo"
              src={pet.photoUrl}
              alt={`${pet.name}, ${pet.breed || pet.species}`}
              width="900"
              height="600"
            />
          )}
          <div className="pet-detail-content">
            <div className="page-heading pet-heading">
              <div>
                <h1 id="pet-title">{pet.name}</h1>
              </div>
              <span className={`status-badge status-${pet.adoptionStatus}`}>
                {pet.adoptionStatus}
              </span>
            </div>
            <dl className="pet-facts">
              <div>
                <dt>Species</dt>
                <dd>{pet.species}</dd>
              </div>
              <div>
                <dt>Breed</dt>
                <dd>{pet.breed || 'Not listed'}</dd>
              </div>
              <div>
                <dt>Age</dt>
                <dd>{formatAge(pet.ageMonths) || 'Not listed'}</dd>
              </div>
            </dl>
            <div className="pet-section">
              <h2>About {pet.name}</h2>
              <p>
                {pet.description.trim() || 'A description has not been added yet.'}
              </p>
            </div>
            <div className="pet-section">
              <h2>Care needs</h2>
              <p>
                {pet.careNeeds.trim() ||
                  "Care information has not been added yet. Ask the shelter about this pet's needs."}
              </p>
            </div>
            <div className="pet-section">
              <h2>Medical information</h2>
              {authLoading ? (
                <Message kind="loading">Checking your session...</Message>
              ) : !session ? (
                <Message>
                  <Link
                    className="text-link"
                    to={`/account?next=${encodeURIComponent(`/pets/${pet.id}`)}`}
                  >
                    Sign in
                  </Link>{' '}
                  to view medical information shared by the shelter.
                </Message>
              ) : (
                <>
                  <PetLoadState
                    loading={medicalLoading}
                    error={medicalError}
                    subject="medical information"
                  />
                  {!medicalLoading && !medicalError && records.length === 0 && (
                    <p>
                      No medical information has been shared yet. Please ask the
                      shelter for details.
                    </p>
                  )}
                  {!medicalLoading &&
                    !medicalError &&
                    records.map((record) => (
                      <article className="medical-record" key={record.id}>
                        <h3>{record.summary}</h3>
                        <dl className="medical-fields">
                          <div>
                            <dt>Type</dt>
                            <dd className="record-type">{record.record_type}</dd>
                          </div>
                          <div>
                            <dt>Date</dt>
                            <dd>{new Date(`${record.record_date}T00:00:00`).toLocaleDateString(undefined, {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}</dd>
                          </div>
                          {record.details && <div><dt>Notes</dt><dd>{record.details}</dd></div>}
                        </dl>
                      </article>
                    ))}
                </>
              )}
            </div>
            <div className="pet-section pet-detail-actions">
              {pet.adoptionStatus === 'available' ? (
                <Link className="button" to={`/adopt?pet=${pet.id}`}>
                  Apply for {pet.name}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              ) : (
                <Message>
                  {pet.name} is not currently accepting adoption applications.
                </Message>
              )}
              {['available', 'pending'].includes(pet.adoptionStatus) && (
                <Link
                  className="button button-secondary"
                  to={`/visit?pet=${pet.id}`}
                >
                  Schedule a visit
                </Link>
              )}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
