import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import FindPet from './pages/FindPet';
import AdoptPet from './pages/AdoptPet';
import ScheduleVisit from './pages/ScheduleVisit';
import Account from './pages/Account';
import Applications from './pages/Applications';
import PetDetails from './pages/PetDetails';
import About from './pages/About';
import Footer from './components/Footer';
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
import Message from './components/Message';
import { ProfileProvider, useProfile } from './auth/ProfileContext';

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
          <Route path="/pets" element={<FindPet />} />
          <Route path="/pets/:id" element={<PetDetails />} />
          <Route path="/adopt" element={<AdoptPet key={session?.user.id} />} />
          <Route path="/visit" element={<ScheduleVisit key={session?.user.id} />} />
          <Route path="/account" element={<Account />} />
          <Route path="/applications" element={<Applications />} />
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
