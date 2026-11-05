import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from './auth/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import FindPet from './pages/FindPet';
import AdoptPet from './pages/AdoptPet';
import ScheduleVisit from './pages/ScheduleVisit';
import Account from './pages/Account';
import Applications from './pages/Applications';
import PetDetails from './pages/PetDetails';

function AppRoutes() {
  const { pathname, hash } = useLocation();
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
          <Route path="/pets" element={<FindPet />} />
          <Route path="/pets/:id" element={<PetDetails />} />
          <Route path="/adopt" element={<AdoptPet />} />
          <Route path="/visit" element={<ScheduleVisit />} />
          <Route path="/account" element={<Account />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="*" element={<section className="section container"><div className="page-content"><div className="page-heading"><h1>Page not found</h1><p>This page may have moved or the link is incorrect.</p></div><Link className="button" to="/">Back to home</Link></div></section>} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
