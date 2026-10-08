import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from 'react-hot-toast';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, SIGNUPS_OPEN, signInWithProvider, authErrorMessage, isCancelledPopup } from "../utils/firebase";
import { GoogleIcon, GithubIcon } from "../components/customIcons";

// Google and GitHub buttons, shared with the sign up page.
export function SocialButtons({ busy, setBusy, onSuccess, onError }) {
  const handle = async (name) => {
    setBusy(name);
    try {
      await signInWithProvider(name);
      onSuccess();
    } catch (err) {
      if (!isCancelledPopup(err)) {
        console.error(err);
        onError(authErrorMessage(err));
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <button type="button" onClick={() => handle('google')} disabled={!!busy} className="btn btn-secondary w-full">
        {busy === 'google' ? <span className="spinner" aria-hidden="true" /> : <GoogleIcon />}
        Continue with Google
      </button>
      <button type="button" onClick={() => handle('github')} disabled={!!busy} className="btn btn-secondary w-full">
        {busy === 'github' ? <span className="spinner" aria-hidden="true" /> : <GithubIcon />}
        Continue with GitHub
      </button>
    </div>
  );
}

export function Divider() {
  return (
    <div className="my-6 flex items-center gap-3 text-muted" aria-hidden="true">
      <span className="h-px flex-1 bg-line" />
      or
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // 'email' | 'google' | 'github' | 'reset' | null
  const navigate = useNavigate();

  const onSuccess = () => {
    toast.success('Welcome back');
    navigate('/');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError('');
    setBusy('email');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch (err) {
      console.error(err);
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleReset = async () => {
    if (!email) {
      setError('Enter your email above, then choose "Forgot password?" again.');
      return;
    }
    setError('');
    setBusy('reset');
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('If that email has an account, a reset link is on its way.');
    } catch (err) {
      console.error(err);
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-2 text-muted">Welcome back to OutfitGen.</p>

      <div className="card mt-8">
        <form className="flex flex-col gap-4" onSubmit={handleLogin} noValidate>
          <div>
            <label htmlFor="email" className="label">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="password" className="font-medium">Password</label>
              <button type="button" onClick={handleReset} disabled={!!busy} className="link rounded disabled:opacity-50">
                Forgot password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </div>
          {error && <p role="alert" className="text-danger">{error}</p>}
          <button type="submit" disabled={!!busy} className="btn btn-primary w-full">
            {busy === 'email' && <span className="spinner" aria-hidden="true" />}
            {busy === 'email' ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <Divider />
        <SocialButtons busy={busy} setBusy={setBusy} onSuccess={onSuccess} onError={setError} />
      </div>

      <p className="mt-6 text-center text-muted">
        {SIGNUPS_OPEN ? (
          <>Don't have an account? <Link to="/signup" className="link">Sign up</Link></>
        ) : (
          'New sign ups are temporarily closed.'
        )}
      </p>
    </div>
  );
}
export default Login;
