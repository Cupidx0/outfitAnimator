import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, SIGNUPS_OPEN, authErrorMessage } from '../utils/firebase';
import { SocialButtons, Divider } from './login';

export const SignUp = () => {
  if (!SIGNUPS_OPEN) {
    return (
      <div className="mx-auto w-full max-w-sm">
        <div className="card flex flex-col items-center gap-4 py-12 text-center">
          <h1 className="text-2xl font-semibold">Sign ups are paused</h1>
          <p className="text-muted">
            We're not taking new accounts right now. If you already have one, you can still log in.
          </p>
          <Link to="/login" className="btn btn-primary">Log in</Link>
        </div>
      </div>
    );
  }
  return <SignUpForm />;
};

const fields = [
  ['firstName', 'First name', 'text', 'given-name'],
  ['lastName', 'Last name', 'text', 'family-name'],
  ['email', 'Email', 'email', 'email'],
  ['password', 'Password', 'password', 'new-password'],
  ['confirmPassword', 'Confirm password', 'password', 'new-password'],
];

function SignUpForm() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);
  const navigate = useNavigate();

  const onSuccess = () => {
    toast.success('Account created');
    navigate('/');
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (Object.values(form).some((v) => !v)) return setError('Fill in every field.');
    if (form.password.length < 6) return setError('Use a password with at least 6 characters.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');

    setError('');
    setBusy('email');
    try {
      const { user } = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(user, { displayName: `${form.firstName} ${form.lastName}`.trim() });
      onSuccess();
    } catch (err) {
      console.error(err);
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <p className="mt-2 text-muted">Start building your digital closet.</p>

      <div className="card mt-8">
        <form className="flex flex-col gap-4" onSubmit={handleSignup} noValidate>
          {fields.map(([name, label, type, autoComplete]) => (
            <div key={name}>
              <label htmlFor={name} className="label">{label}</label>
              <input
                id={name}
                type={type}
                autoComplete={autoComplete}
                value={form[name]}
                onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                className="input"
              />
            </div>
          ))}
          {error && <p role="alert" className="text-danger">{error}</p>}
          <button type="submit" disabled={!!busy} className="btn btn-primary w-full">
            {busy === 'email' && <span className="spinner" aria-hidden="true" />}
            {busy === 'email' ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <Divider />
        <SocialButtons busy={busy} setBusy={setBusy} onSuccess={onSuccess} onError={setError} />
      </div>

      <p className="mt-6 text-center text-muted">
        Already have an account? <Link to="/login" className="link">Log in</Link>
      </p>
    </div>
  );
}

export default SignUp;
