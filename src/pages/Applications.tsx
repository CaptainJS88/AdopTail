import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import PetLoadState from '../components/PetLoadState';
import Message from '../components/Message';
import { supabase } from '../lib/supabase';

type ApplicationRow = {
  id: string;
  status: string;
  submitted_at: string;
  decided_at: string | null;
  animal: { name: string } | null;
};

export default function Applications() {
  const { session, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!session) {
      setApplications([]);
      setLoading(true);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    setError(null);
    supabase
      .from('adoption_applications')
      .select('id, status, submitted_at, decided_at, animal:animals(name)')
      .order('submitted_at', { ascending: false })
      .returns<ApplicationRow[]>()
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        else setApplications(data ?? []);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  if (authLoading)
    return (
      <section className="section container">
        <Message kind="loading">Checking your session...</Message>
      </section>
    );
  if (!session)
    return (
      <section className="section container">
        <div className="page-content">
          <div className="page-heading">
            <h1>Your applications</h1>
            <p>Keep track of your adoption journey.</p>
          </div>
          <Message>
            Sign in to view your applications and their latest status.
          </Message>
          <Link className="button" to="/account?next=/applications">
            Sign in
          </Link>
        </div>
      </section>
    );

  return (
    <section className="section container" aria-labelledby="applications-title">
      <div className="page-content">
        <div className="page-heading">
          <h1 id="applications-title">Your applications</h1>
          <p>Track your applications and the shelter's decisions.</p>
        </div>
        <PetLoadState loading={loading} error={error} subject="applications" />
        {!loading && !error && applications.length === 0 && (
          <div className="empty-state">
            <h2>No applications yet</h2>
            <p>Find a pet you would like to bring home.</p>
            <Link className="button button-small" to="/pets">
              Find a pet
            </Link>
          </div>
        )}
        <div className="application-list">
          {!loading &&
            !error &&
            applications.map((application) => (
              <article className="pet-card" key={application.id}>
                <div className="pet-card-content">
                  <div className="application-heading">
                    <h2>{application.animal?.name ?? 'Animal listing'}</h2>
                    <span
                      className={`status-badge status-${application.status}`}
                    >
                      {application.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="application-date">
                    Submitted on{' '}
                    {new Date(application.submitted_at).toLocaleDateString(
                      undefined,
                      { month: 'short', day: 'numeric', year: 'numeric' },
                    )}
                  </p>
                  {application.status === 'submitted' && (
                    <p className="application-note">
                      Your application is waiting for the shelter's review.
                    </p>
                  )}
                  {application.decided_at && (
                    <p className="application-date">
                      Updated on{' '}
                      {new Date(application.decided_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </article>
            ))}
        </div>
      </div>
    </section>
  );
}
