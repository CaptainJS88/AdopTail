import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import type { ApplicationDraft } from './types';
import Header from './components/Header';
import Home from './pages/Home';
import FindPet from './pages/FindPet';
import AdoptPet from './pages/AdoptPet';
import ScheduleVisit from './pages/ScheduleVisit';

export default function App() {
  const [application, setApplication] = useState<ApplicationDraft | null>(null);
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // go to the section if the link has one, otherwise start at the top
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <Header />
      <main id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pets" element={<FindPet />} />
          <Route path="/adopt" element={<AdoptPet application={application} onContinue={setApplication} />} />
          <Route path="/visit" element={<ScheduleVisit application={application} />} />
          <Route path="*" element={<section className="section container"><h1>Page not found</h1></section>} />
        </Routes>
      </main>
    </>
  );
}
