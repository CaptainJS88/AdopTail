import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import PetLoadState from '../components/PetLoadState';
import Message from '../components/Message';
import { supabase } from '../lib/supabase';
import { requestError } from '../lib/messages';
import { formatStatus } from '../lib/status';

type ApplicationRow = {
  id: string;
  status: string;
  submitted_at: string;
  decided_at: string | null;
  rejection_reason: string | null;
  adopted_at: string | null;
  animal: { name: string } | null;
};

export default function Applications() {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id;
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const id = userId;
    let active = true;
    let fetching = false;
    setLoading(true);

    async function loadApplications() {
      if (fetching) return;
      fetching = true;
      try {
        const [applicationResult, adoptionResult] = await Promise.all([
          supabase.from('adoption_applications')
            .select('id, status, submitted_at, decided_at, rejection_reason, animal:animals(name)')
            .eq('adopter_id', id).order('submitted_at', { ascending: false })
            .returns<Omit<ApplicationRow, 'adopted_at'>[]>(),
          supabase.from('adoptions').select('application_id, adopted_at').eq('adopter_id', id),
        ]);
        if (applicationResult.error) throw applicationResult.error;
        if (adoptionResult.error) throw adoptionResult.error;
        if (active) {
          setApplications((applicationResult.data ?? []).map(row => ({
            ...row,
            adopted_at: adoptionResult.data?.find(adoption => adoption.application_id === row.id)?.adopted_at || null,
          })));
          setError(null);
        }
      } catch (cause) {
        if (active) setError(requestError(cause, 'Your applications could not be loaded. Please try again.'));
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    }

    const refresh = () => { if (document.visibilityState === 'visible') void loadApplications(); };
    void loadApplications();
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [userId]);

  if (authLoading) return <section className="section container"><Message kind="loading">Checking your session...</Message></section>;
  if (!session) return (
    <section className="section container"><div className="page-content">
      <div className="page-heading"><h1>Your applications</h1></div>
      <Message>Sign in to view your applications.</Message>
      <Link className="button" to="/account?next=/applications">Sign in</Link>
    </div></section>
  );

  const groups = [
    { title: 'In review', rows: applications.filter(row => row.status === 'submitted' && !row.adopted_at) },
    { title: 'Approved', rows: applications.filter(row => row.status === 'approved' && !row.adopted_at) },
    { title: 'Adopted', rows: applications.filter(row => row.adopted_at).sort((a, b) => new Date(b.adopted_at || '').getTime() - new Date(a.adopted_at || '').getTime()) },
    { title: 'Rejected', rows: applications.filter(row => row.status === 'rejected' && !row.adopted_at) },
  ];

  return (
    <section className="section container" aria-labelledby="applications-title">
      <div className="page-content grouped-page">
        <div className="page-heading"><h1 id="applications-title">Your applications</h1></div>
        <PetLoadState loading={loading} error={error} subject="applications" />
        {!loading && !error && applications.length === 0 && <div className="empty-state history-empty"><h2>No applications yet</h2><p>Applications you submit will appear here.</p><Link className="button button-secondary" to="/pets">Find a pet</Link></div>}
        <div className="status-groups">{!loading && !error && groups.filter(group => group.rows.length > 0).map(group => (
          <section className="status-group" key={group.title}>
            <h2 className="status-group-title">{formatStatus(group.title)}</h2>
            {group.rows.map(application => (
              <article className="visit-record" key={application.id}>
                <div className="application-heading">
                  <h3>{application.animal?.name || 'Pet listing'}</h3>
                  <span className={`status-badge status-${application.adopted_at ? 'completed' : application.status}`}>{formatStatus(application.adopted_at ? 'Adopted' : application.status)}</span>
                </div>
                <p className="application-date">{application.adopted_at ? 'Adopted:' : 'Submitted:'} {new Date(application.adopted_at || application.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                {application.status === 'rejected' && <dl className="record-details"><div><dt>Reason for rejection:</dt><dd>{application.rejection_reason || 'No reason was recorded. Please contact the shelter for details.'}</dd></div></dl>}
                {!application.adopted_at && application.decided_at && <p className="application-date">Updated: {new Date(application.decided_at).toLocaleDateString()}</p>}
              </article>
            ))}
          </section>
        ))}</div>
      </div>
    </section>
  );
}
