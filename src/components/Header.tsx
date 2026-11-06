import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { session } = useAuth();

  return (
    <header className="site-header">
      <div className="container header-content">
        <Link className="brand" to="/" aria-label="Adoptail home"><img src="/adoptail-logo.svg" alt="Adoptail" /></Link>
        <button className="menu-button" type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav id="main-navigation" className={menuOpen ? 'navigation open' : 'navigation'} aria-label="Main navigation">
          <Link to="/pets" onClick={() => setMenuOpen(false)}>Find a pet</Link>
          <Link to="/#how-it-works" onClick={() => setMenuOpen(false)}>How adoption works</Link>
          <Link to="/about" onClick={() => setMenuOpen(false)}>About us</Link>
          {session && <Link to="/applications" onClick={() => setMenuOpen(false)}>My applications</Link>}
          <Link to="/account" onClick={() => setMenuOpen(false)}>
            {session ? 'My account' : 'Sign in'}
          </Link>
        </nav>
      </div>
    </header>
  );
}
