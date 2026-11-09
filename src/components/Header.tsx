import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from '../auth/ProfileContext';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { session } = useAuth();
  const { role, staffAccessApproved } = useProfile();

  return (
    <header className="site-header">
      <div className="container header-content">
        <Link className="brand" to="/" aria-label="Adoptail home"><img src="/adoptail-logo.svg" alt="Adoptail" /></Link>
        <button className="menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav id="main-navigation" className={menuOpen ? 'navigation open' : 'navigation'} aria-label="Main navigation">
          <NavLink to="/" end onClick={() => setMenuOpen(false)}>Home</NavLink>
          <NavLink to="/pets" onClick={() => setMenuOpen(false)}>Find a pet</NavLink>
          {session && <NavLink to="/applications" onClick={() => setMenuOpen(false)}>My applications</NavLink>}
          {session && role === 'staff' && staffAccessApproved && <NavLink to="/staff" onClick={() => setMenuOpen(false)}>Staff dashboard</NavLink>}
          <NavLink to="/about" onClick={() => setMenuOpen(false)}>About us</NavLink>
          <NavLink to="/FAQ" onClick={() => setMenuOpen(false)}>FAQs</NavLink>
          <NavLink to="/account" onClick={() => setMenuOpen(false)}>
            {session ? 'My account' : 'Sign in'}
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
