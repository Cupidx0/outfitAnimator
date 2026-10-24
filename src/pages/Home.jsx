import React, { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { SIGNUPS_OPEN } from '../utils/firebase'
import { api } from '../utils/api'
import { UploadIcon } from '../components/customIcons'

const MAX_UPLOAD_MB = 10;
const BETA_KEY = 'betaNoticeShown';

// Values must match what the backend expects.
const CATEGORIES = [
  ['top', 'Top'], ['hoodies', 'Hoodie'], ['coat', 'Coat'],
  ['trouser', 'Trousers'], ['short', 'Shorts'], ['cap', 'Cap'],
];

// Quick starts that fill the prompt box.
const OCCASIONS = [
  ['Work', 'A full day at the office, smart but comfortable'],
  ['Date night', 'Dinner at a nice restaurant this evening'],
  ['Weekend', 'Relaxed weekend errands and coffee with friends'],
  ['Wedding guest', 'An afternoon wedding, dressy but not formal'],
  ['Gym', 'A workout at the gym, then a quick lunch'],
];

const STEPS = [
  ['Snap your clothes', 'Upload a photo of each piece. We clean it up and note its colours.'],
  ['Say where you are going', 'A beach party, a job interview, a lazy Sunday. Plain words work.'],
  ['Get dressed', 'We pick an outfit from your closet that suits the plan and the weather.'],
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
  const [geoState, setGeoState] = useState('pending'); // pending | on | off
  const [showBeta, setShowBeta] = useState(() => !readSession(BETA_KEY));

  useEffect(() => {
    if (!navigator.geolocation) return setGeoState('off');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        setGeoState('on');
      },
      (err) => {
        console.warn('Geolocation unavailable, using London weather:', err.message);
        setGeoState('off');
      },
    );
  }, []);

  const dismissBeta = () => {
    writeSession(BETA_KEY, 'true');
    setShowBeta(false);
  };

  const firstName = user?.displayName?.split(' ')[0];

  return (
    <div className="flex flex-col gap-8">
      {showBeta && (
        <div role="status" className="flex items-center justify-between gap-4 rounded-2xl bg-subtle px-4 py-3">
          <p className="text-muted">
            <span className="font-medium text-ink">Beta.</span> Some features may be incomplete while we keep improving.
          </p>
          <button type="button" onClick={dismissBeta} className="btn btn-ghost -my-2">Dismiss</button>
        </div>
      )}

      {authLoading ? (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="skeleton h-[320px] lg:col-span-3" />
          <div className="skeleton h-[320px] lg:col-span-2" />
        </div>
      ) : user ? (
        <>
          <div>
            <h1 className="text-2xl font-semibold">{firstName ? `Hi ${firstName}, what's the plan?` : "What's the plan?"}</h1>
            <p className="mt-2 max-w-prose text-muted">
              Tell us where you're going and we'll put together an outfit from your closet, matched to today's weather.
            </p>
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-5">
            <OutfitGenerator coords={coords} geoState={geoState} />
            <AddToCloset coords={coords} />
          </div>
        </>
      ) : (
        <Welcome />
      )}
    </div>
  );
}

function Welcome() {
  return (
    <>
      <section className="flex flex-col items-start gap-6 py-8 md:py-12">
        <p className="rounded-full bg-subtle px-3 py-1 font-medium text-accent">Your closet, styled</p>
        <h1 className="max-w-prose text-2xl font-semibold">
          Never stare at a full wardrobe with nothing to wear again.
        </h1>
        <p className="max-w-prose text-lg text-muted">
          OutfitGen suggests outfits from clothes you already own, based on where you're going and today's weather.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link to="/login" className="btn btn-primary">Log in to start</Link>
          {SIGNUPS_OPEN && <Link to="/signup" className="btn btn-secondary">Create an account</Link>}
        </div>
      </section>

      <section aria-labelledby="how-it-works">
        <h2 id="how-it-works" className="text-lg font-semibold">How it works</h2>
        <ol className="mt-4 grid gap-4 md:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="card flex flex-col gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent font-semibold text-on-accent">
                {i + 1}
              </span>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

function OutfitGenerator({ coords, geoState }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const promptRef = useRef(null);

  const pickOccasion = (text) => {
    setPrompt(text);
    setError('');
    promptRef.current?.focus();
  };

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
      setResult({
        title: data.title,
        idea: data.outfit_idea,
        imageUrl: data.image_url,
        closetItems: data.closet_items || [],
        missing: data.missing || [],
        extras: data.extras || [],
      });
    } catch (err) {
      console.error(err);
      setError("We couldn't generate an outfit right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const weatherNote = {
    pending: 'Checking your location for the weather...',
    on: 'Using the weather where you are.',
    off: 'Location is off, so we use London weather.',
  }[geoState];

  return (
    <section className="card lg:col-span-3">
      <form onSubmit={handleGenerate} noValidate>
        <label htmlFor="prompt" className="label">Where are you going?</label>
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Quick occasions">
          {OCCASIONS.map(([label, text]) => (
            <button
              key={label}
              type="button"
              onClick={() => pickOccasion(text)}
              aria-pressed={prompt === text}
              disabled={loading}
              className="chip"
            >
              {label}
            </button>
          ))}
        </div>
        <textarea
          id="prompt"
          ref={promptRef}
          rows={3}
          className="input resize-y"
          placeholder="Or describe it, e.g. a beach party on Saturday afternoon"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? 'prompt-error' : 'weather-note'}
        />
        {error && <p id="prompt-error" role="alert" className="mt-2 text-danger">{error}</p>}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p id="weather-note" className="text-muted">{weatherNote}</p>
          <button type="submit" disabled={loading} className="btn btn-primary w-full sm:w-auto">
            {loading && <span className="spinner" aria-hidden="true" />}
            {loading ? 'Styling...' : 'Style me'}
          </button>
        </div>
      </form>

      <div className="mt-6 border-t pt-6" aria-live="polite" aria-busy={loading}>
        {loading ? (
          <div className="flex flex-col gap-3">
            <p className="text-muted">Picking pieces and drawing your look. This can take up to a minute.</p>
            <div className="skeleton aspect-square w-full" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        ) : result ? (
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold">{result.title || 'Your outfit'}</h2>
            <p className="max-w-prose whitespace-pre-line">{result.idea}</p>
            {result.imageUrl && (
              <img src={result.imageUrl} alt="Illustration of the suggested outfit" className="w-full rounded-xl bg-subtle" />
            )}
            {result.closetItems.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Pieces from your closet">
                {result.closetItems.map((item) => (
                  <li key={item.id} className="flex flex-col gap-1">
                    <img src={item.cartoonURL} alt={`${item.category} from your closet`} className="aspect-square w-full rounded-xl bg-subtle object-cover" />
                    {item.why && <p className="text-muted">{item.why}</p>}
                  </li>
                ))}
              </ul>
            )}
            {result.missing.length > 0 && (
              <div>
                <h3 className="font-semibold">Worth adding to your closet</h3>
                <ul className="mt-2 list-disc pl-5">
                  {result.missing.map(({ piece, why }) => (
                    <li key={piece}>{piece}{why && <span className="text-muted"> ({why})</span>}</li>
                  ))}
                </ul>
              </div>
            )}
            {result.extras.length > 0 && (
              <p className="text-muted">
                <span className="font-medium text-ink">Finish with:</span> {result.extras.join(', ')}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 rounded-xl bg-subtle px-6 py-12 text-center">
            <p className="font-medium">Your look will appear here</p>
            <p className="text-muted">Pick an occasion above or describe your plans.</p>
          </div>
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
  const [dragging, setDragging] = useState(false);
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

  const pickFile = (selected) => {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      return setStatus({ type: 'error', message: 'That file is not an image. Choose a JPG or PNG.' });
    }
    if (selected.size > MAX_UPLOAD_MB * 1024 * 1024) {
      if (inputRef.current) inputRef.current.value = '';
      return setStatus({ type: 'error', message: `Choose a photo under ${MAX_UPLOAD_MB} MB.` });
    }
    setFile(selected);
    setStatus(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (!uploading) pickFile(e.dataTransfer.files[0]);
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
      <p className="mt-2 text-muted">One clothing item per photo works best.</p>

      <form onSubmit={handleUpload} noValidate className="mt-6 flex flex-col gap-6">
        <label
          htmlFor="upload-input"
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center text-muted transition-colors focus-within:border-accent hover:border-muted hover:bg-subtle ${dragging ? 'border-accent bg-subtle' : ''}`}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Selected item" className="max-h-[240px] rounded-lg object-contain" />
              <span className="max-w-full truncate">{file.name}</span>
              <span className="font-medium text-accent">Change photo</span>
            </>
          ) : (
            <>
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-subtle text-ink">
                <UploadIcon />
              </span>
              <span className="font-medium text-ink">Drop a photo or browse</span>
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
            onChange={(e) => pickFile(e.target.files[0])}
            disabled={uploading}
          />
        </label>

        <fieldset disabled={uploading}>
          <legend className="label">What is it?</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(([value, label]) => (
              <label key={value} className="chip">
                <input
                  type="radio"
                  name="category"
                  value={value}
                  checked={category === value}
                  onChange={() => setCategory(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        {status && (
          <p role={status.type === 'error' ? 'alert' : 'status'} className={status.type === 'error' ? 'text-danger' : 'text-success'}>
            {status.message}{' '}
            {status.type === 'success' && <Link to="/closet" className="link">View closet</Link>}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button type="submit" disabled={uploading} className="btn btn-secondary w-full">
            {uploading && <span className="spinner" aria-hidden="true" />}
            {uploading ? 'Adding item...' : 'Add to closet'}
          </button>
          {uploading && <p className="text-muted">Stylizing your photo can take up to a minute.</p>}
        </div>
      </form>
    </section>
  );
}

export default Home;
