import { lazy, Suspense, useEffect } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ProfileProvider, useProfile } from './auth/ProfileContext';
import Footer from './components/Footer';
import Header from './components/Header';
import Message from './components/Message';
import About from './pages/About';
import Account from './pages/Account';
import AdoptPet from './pages/AdoptPet';
import Applications from './pages/Applications';
import FAQ from './pages/FAQ';
import FindPet from './pages/FindPet';
import Home from './pages/Home';
import PetDetails from './pages/PetDetails';
import ScheduleVisit from './pages/ScheduleVisit';
import Visits from './pages/Visits';

const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));

function StaffRoute() {
  const { session, loading: authLoading } = useAuth();
  const { role, staffAccessApproved, profileLoading, profileError } = useProfile();

  if (authLoading || (session && profileLoading))
    return <section className="section container"><Message kind="loading">Checking staff access...</Message></section>;
  if (!session)
    return <Navigate to={`/account?next=${encodeURIComponent('/staff')}`} replace />;
  if (profileError)
    return <section className="section container"><Message kind="error">We could not verify your staff access. Please refresh or sign in again.</Message></section>;
  if (role !== 'staff' || !staffAccessApproved)
    return <section className="section container"><div className="page-content"><div className="page-heading"><h1>Staff access required</h1><p>This area is available only to approved shelter staff.</p></div><Link className="button button-secondary" to="/">Return to Adoptail</Link></div></section>;

  return <StaffDashboard />;
}

function AdopterRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const { role, profileLoading, profileError, reload } = useProfile();
  if (loading || (session && profileLoading)) return <section className="section container"><Message kind="loading">Checking your account...</Message></section>;
  if (session && profileError) return <section className="section container"><Message kind="error">We could not check your account. Please try again.</Message><button type="button" className="text-button" onClick={reload}>Try again</button></section>;
  if (session && role !== 'adopter') return (
    <section className="section container"><div className="page-content">
      <div className="page-heading"><h1>Adopter account required</h1><p>Staff accounts manage shelter requests and cannot apply for pets or request visits.</p></div>
      <Link className="text-link" to="/staff">Go to staff dashboard</Link>
    </div></section>
  );
  return children;
}

function AppRoutes() {
  const { pathname, hash } = useLocation();
  const { session } = useAuth();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/FAQ" element={<FAQ />} />
          <Route path="/pets" element={<FindPet />} />
          <Route path="/pets/:id" element={<PetDetails />} />
          <Route path="/adopt" element={<AdopterRoute><AdoptPet key={session?.user.id} /></AdopterRoute>} />
          <Route path="/visit" element={<AdopterRoute><ScheduleVisit key={session?.user.id} /></AdopterRoute>} />
          <Route path="/account" element={<Account />} />
          <Route path="/applications" element={<AdopterRoute><Applications key={session?.user.id} /></AdopterRoute>} />
          <Route path="/visits" element={<AdopterRoute><Visits key={session?.user.id} /></AdopterRoute>} />
          <Route path="/staff" element={<Suspense fallback={<section className="section container"><Message kind="loading">Loading staff dashboard...</Message></section>}><StaffRoute /></Suspense>} />
          <Route path="*" element={<section className="section container"><div className="page-content"><div className="page-heading"><h1>Page not found</h1><p>This page may have moved or the link is incorrect.</p></div><Link className="button" to="/">Back to home</Link></div></section>} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return <AuthProvider><ProfileProvider><AppRoutes /></ProfileProvider></AuthProvider>;
}
