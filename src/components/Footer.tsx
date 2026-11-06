import { Link } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <Link className="brand" to="/" aria-label="Adoptail home">
          <img src="/adoptail-logo.svg" alt="Adoptail" />
        </Link>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/about">About us</Link>
          <a href="#main">Back to top <ArrowUp size={16} aria-hidden="true" /></a>
        </nav>
      </div>
    </footer>
  );
}
