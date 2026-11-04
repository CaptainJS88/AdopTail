import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import PetLoadState from '../components/PetLoadState';
import { supabase } from '../lib/supabase';

type ApplicationRow = {
  id: string;
  status: string;
  submitted_at: string;
  decided_at: string | null;
  animal: { name: string }[] | null;
};

export default function Applications() {
  const { session, loading: authLoading } = useAuth();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!session) { setLoading(false); return () => { active = false; }; }
    supabase.from('adoption_applications')
      .select('id, status, submitted_at, decided_at, animal:animals(name)')
      .order('submitted_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        else setApplications((data ?? []) as ApplicationRow[]);
        setLoading(false);
      });
    return () => { active = false; };
  }, [session]);

  if (authLoading) return <section className="section container"><p role="status">Checking your session…</p></section>;
  if (!session) return <section className="section container"><h1>Your applications</h1><p>Sign in to view your applications.</p><Link className="button" to="/account?next=/applications">Sign in</Link></section>;

  return (
    <section className="section container" aria-labelledby="applications-title">
      <h1 id="applications-title">Your applications</h1>
      <PetLoadState loading={loading} error={error} />
      {!loading && !error && applications.length === 0 && <p>You have not submitted an application yet.</p>}
      {!loading && !error && applications.map((application) => (
        <article className="pet-card" key={application.id}>
          <div className="pet-card-content">
            <h2>{application.animal?.[0]?.name ?? 'Animal listing'}</h2>
            <p>Status: {application.status}</p>
            <p>Submitted: {new Date(application.submitted_at).toLocaleString()}</p>
            {application.decided_at && <p>Updated: {new Date(application.decided_at).toLocaleString()}</p>}
          </div>
        </article>
      ))}
    </section>
  );
}
