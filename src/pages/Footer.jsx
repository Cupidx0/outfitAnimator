import React from 'react';
import { Link } from 'react-router-dom';
import { SIGNUPS_OPEN } from '../utils/firebase';

// Set VITE_CONTACT_EMAIL in .env (and in Vercel) to show contact links across the site.
const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL;

export function ContactLink({ children = 'contact us' }) {
  return CONTACT_EMAIL ? <a href={`mailto:${CONTACT_EMAIL}`}>{children}</a> : children;
}

const links = [
  ['/services', 'Services'],
  ['/about', 'About'],
  ['/faq', 'FAQ'],
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
  ...(SIGNUPS_OPEN ? [['/signup', 'Sign up']] : []),
];

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 md:flex-row md:items-center md:justify-between md:px-6">
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {links.map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="rounded text-muted underline-offset-4 hover:text-ink hover:underline">
                  {label}
                </Link>
              </li>
            ))}
            {CONTACT_EMAIL && (
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className="rounded text-muted underline-offset-4 hover:text-ink hover:underline">
                  Contact
                </a>
              </li>
            )}
          </ul>
        </nav>
        <p className="text-muted">&copy; {year} Godwin Ltd.</p>
      </div>
    </footer>
  );
}
export default Footer;
