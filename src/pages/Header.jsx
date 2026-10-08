import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import toast from 'react-hot-toast'
import { auth } from '../utils/firebase'
import { useAuth } from './AuthContext'

const navClass = ({ isActive }) =>
  `btn btn-ghost ${isActive ? 'text-ink' : ''}`;

function Header() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      toast.success('Signed out');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error('Could not sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <header className="border-b bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="rounded-lg text-lg font-semibold">
          OutfitGen
        </Link>
        <nav className="flex items-center gap-1">
          <NavLink to="/closet" className={navClass}>Closet</NavLink>
          {!loading && (user ? (
            <button type="button" onClick={handleSignOut} disabled={signingOut} className="btn btn-ghost">
              {signingOut ? 'Signing out...' : 'Sign out'}
            </button>
          ) : (
            <NavLink to="/login" className={navClass}>Log in</NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
export default Header;
