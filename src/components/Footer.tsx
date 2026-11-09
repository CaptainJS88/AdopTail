import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-content">
        <Link className="brand" to="/" aria-label="Adoptail home">
          <img src="/adoptail-logo.svg" alt="Adoptail" />
        </Link>
      </div>
    </footer>
  );
}
