import React, { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { api } from '../utils/api'
import { UploadIcon } from '../components/customIcons'

const MAX_UPLOAD_MB = 10;
const BETA_KEY = 'betaNoticeShown';

// Values must match what the backend expects.
const CATEGORIES = [
  { group: 'Tops', options: [['top', 'Top'], ['hoodies', 'Hoodie'], ['coat', 'Coat']] },
  { group: 'Bottoms', options: [['trouser', 'Trousers'], ['short', 'Shorts']] },
  { group: 'Accessories', options: [['cap', 'Cap']] },
];

const readSession = (key) => {
  try { return sessionStorage.getItem(key); } catch { return null; }
};
const writeSession = (key, value) => {
  try { sessionStorage.setItem(key, value); } catch { /* storage unavailable */ }
};

function Home() {
  const { user, loading: authLoading } = useAuth();
  const [coords, setCoords] = useState(null);
  const [showBeta, setShowBeta] = useState(() => !readSession(BETA_KEY));

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => setCoords({ lat: position.coords.latitude, lon: position.coords.longitude }),
      (err) => console.warn('Geolocation unavailable, using London weather:', err.message),
    );
  }, []);

  const dismissBeta = () => {
    writeSession(BETA_KEY, 'true');
    setShowBeta(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {showBeta && (
        <div role="status" className="flex items-start justify-between gap-4 rounded-xl border bg-surface p-4">
          <p className="max-w-prose text-muted">
            OutfitGen is in beta. Some features may be incomplete while we keep improving it.
          </p>
          <button type="button" onClick={dismissBeta} className="btn btn-ghost -my-2">Dismiss</button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-semibold">What should you wear?</h1>
        <p className="mt-2 max-w-prose text-muted">
          Describe where you're going and OutfitGen suggests an outfit from your closet, matched to today's weather.
        </p>
      </div>

      {authLoading ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="skeleton h-[320px] lg:col-span-3" />
          <div className="skeleton h-[320px] lg:col-span-2" />
        </div>
      ) : user ? (
        <div className="grid items-start gap-6 lg:grid-cols-5">
          <OutfitGenerator coords={coords} />
          <AddToCloset coords={coords} />
        </div>
      ) : (
        <section className="card flex flex-col items-start gap-4">
          <h2 className="text-lg font-semibold">Log in to get started</h2>
          <p className="max-w-prose text-muted">
            Outfit ideas are built from the clothes you've added to your closet, so you need an account to use them.
          </p>
          <Link to="/login" className="btn btn-primary">Log in</Link>
        </section>
      )}
    </div>
  );
}

function OutfitGenerator({ coords }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (prompt.trim().length < 10) {
      setError('Add a bit more detail, like the occasion or the vibe you want.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await api('/generate_outfit_from_closet', {
        method: 'POST',
        json: { lat: coords?.lat ?? null, lon: coords?.lon ?? null, prompt },
      });
      setResult({ idea: data.outfit_idea, imageUrl: data.image_url });
    } catch (err) {
      console.error(err);
      setError("We couldn't generate an outfit right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card lg:col-span-3">
      <form onSubmit={handleGenerate} noValidate>
        <label htmlFor="prompt" className="label">Where are you going?</label>
        <textarea
          id="prompt"
          rows={4}
          className="input resize-y"
          placeholder="A beach party on Saturday afternoon"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? 'prompt-error' : undefined}
        />
        {error && <p id="prompt-error" role="alert" className="mt-2 text-danger">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-primary mt-4 w-full sm:w-auto">
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? 'Generating...' : 'Get outfit idea'}
        </button>
        {loading && <p className="mt-2 text-muted">Picking an outfit and drawing it can take up to a minute.</p>}
      </form>

      <div className="mt-6" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="flex flex-col gap-3">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton mt-3 aspect-square w-full" />
          </div>
        ) : result ? (
          <div className="flex flex-col gap-4 border-t pt-6">
            <h2 className="text-lg font-semibold">Your outfit</h2>
            <p className="max-w-prose whitespace-pre-line">{result.idea}</p>
            {result.imageUrl && (
              <img src={result.imageUrl} alt="Illustration of the suggested outfit" className="w-full rounded-lg border" />
            )}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted">
            Your outfit idea will show up here.
          </p>
        )}
      </div>
    </section>
  );
}

function AddToCloset({ coords }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'error' | 'success', message }
  const inputRef = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    if (selected.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setStatus({ type: 'error', message: `Choose a photo under ${MAX_UPLOAD_MB} MB.` });
      e.target.value = '';
      return;
    }
    setFile(selected);
    setStatus(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setStatus({ type: 'error', message: 'Choose a photo first.' });
    if (!category) return setStatus({ type: 'error', message: 'Pick a category for this item.' });

    setUploading(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append('image', file, file.name);
      form.append('category', category);
      if (coords) {
        form.append('lat', coords.lat);
        form.append('lon', coords.lon);
      }
      await api('/cartoonize', { method: 'POST', form });

      toast.success('Added to your closet');
      setStatus({ type: 'success', message: 'Added to your closet.' });
      setFile(null);
      setCategory('');
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      console.error('Upload error:', err);
      // 400s carry a message meant for the user, like an unsupported format.
      const message = err.status === 400 ? err.message : "We couldn't add that item. Please try again.";
      setStatus({ type: 'error', message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="card lg:col-span-2">
      <h2 className="text-lg font-semibold">Add to your closet</h2>
      <p className="mt-2 text-muted">Upload a photo of one clothing item.</p>

      <form onSubmit={handleUpload} noValidate className="mt-6 flex flex-col gap-4">
        <div>
          <span className="label">Photo</span>
          <label
            htmlFor="upload-input"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-muted transition-colors focus-within:border-accent hover:border-muted hover:bg-subtle"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Selected item" className="max-h-[240px] rounded-lg object-contain" />
            ) : (
              <>
                <UploadIcon />
                <span className="font-medium text-ink">Choose a photo</span>
                <span>JPG or PNG, up to {MAX_UPLOAD_MB} MB</span>
              </>
            )}
            <input
              ref={inputRef}
              id="upload-input"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleFileChange}
              disabled={uploading}
            />
          </label>
          {file && <p className="mt-2 truncate text-muted">{file.name}</p>}
        </div>

        <div>
          <label htmlFor="category" className="label">Category</label>
          <select
            id="category"
            className="input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={uploading}
          >
            <option value="" disabled>Select a category</option>
            {CATEGORIES.map(({ group, options }) => (
              <optgroup key={group} label={group}>
                {options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {status && (
          <p role={status.type === 'error' ? 'alert' : 'status'} className={status.type === 'error' ? 'text-danger' : 'text-success'}>
            {status.message}{' '}
            {status.type === 'success' && <Link to="/closet" className="link">View closet</Link>}
          </p>
        )}

        <button type="submit" disabled={uploading} className="btn btn-secondary">
          {uploading && <span className="spinner" aria-hidden="true" />}
          {uploading ? 'Adding item...' : 'Add to closet'}
        </button>
        {uploading && <p className="text-muted">Stylizing your photo can take up to a minute.</p>}
      </form>
    </section>
  );
}

export default Home;
