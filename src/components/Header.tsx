import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Menu, X } from 'lucide-react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container header-content">
        <Link className="brand" to="/" aria-label="Adoptail home">
          <img src="/adoptail-logo.svg" alt="Adoptail" />
        </Link>
        <button
          className="menu-button"
          type="button"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <nav id="main-navigation" className={menuOpen ? 'navigation open' : 'navigation'} aria-label="Main navigation">
          <a href="/#pets" onClick={() => setMenuOpen(false)}>Meet the pets</a>
          <a href="/#how-it-works" onClick={() => setMenuOpen(false)}>How adoption works</a>
          <a href="/#about" onClick={() => setMenuOpen(false)}>About us</a>
          <Link className="button button-small" to="/pets" onClick={() => setMenuOpen(false)}>
            Find a pet <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
