import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';
import { api } from '../utils/api';

function Fashion() {
  const { user, loading: authLoading } = useAuth();
  const [closet, setCloset] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [deletingId, setDeletingId] = useState(null);

  const loadCloset = useCallback(async () => {
    if (!user?.uid) return;
    setStatus('loading');
    try {
      const data = await api('/closet');
      setCloset(data.items);
      setStatus('ready');
    } catch (err) {
      console.error('error:', err);
      setStatus('error');
    }
  }, [user]);

  useEffect(() => {
    loadCloset();
  }, [loadCloset]);

  const deleteItem = async (docId) => {
    if (!window.confirm('Remove this item from your closet?')) return;
    setDeletingId(docId);
    try {
      await api(`/closet/${docId}`, { method: 'DELETE' });
      setCloset(prev => prev.filter(item => item.id !== docId));
      toast.success('Item removed');
    } catch (err) {
      console.error('error deleting item', err);
      toast.error("Couldn't remove that item. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const groupCloset = closet.reduce((groups, item) => {
    const category = item.category || "uncategorized";
    (groups[category] ||= []).push(item);
    return groups;
  }, {});

  const heading = (
    <div>
      <h1 className="text-2xl font-semibold">Your closet</h1>
      {status === 'ready' && closet.length > 0 && (
        <p className="mt-2 text-muted">{closet.length} {closet.length === 1 ? 'item' : 'items'}</p>
      )}
    </div>
  );

  if (!authLoading && !user) {
    return (
      <div className="flex flex-col gap-8">
        {heading}
        <EmptyState
          title="Log in to see your closet"
          body="Your closet holds the clothes OutfitGen uses to suggest outfits."
          action={<Link to="/login" className="btn btn-primary">Log in</Link>}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {heading}

      {authLoading || status === 'loading' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4" aria-busy="true" aria-label="Loading closet">
          {Array.from({ length: 8 }, (_, i) => <div key={i} className="skeleton aspect-square" />)}
        </div>
      ) : status === 'error' ? (
        <EmptyState
          title="We couldn't load your closet"
          body="Check your connection and try again."
          tone="danger"
          action={<button type="button" onClick={loadCloset} className="btn btn-secondary">Try again</button>}
        />
      ) : closet.length === 0 ? (
        <EmptyState
          title="Your closet is empty"
          body="Add a photo of a clothing item and it will show up here."
          action={<Link to="/" className="btn btn-primary">Add your first item</Link>}
        />
      ) : (
        Object.entries(groupCloset).map(([category, items]) => (
          <section key={category} aria-labelledby={`cat-${category}`}>
            <h2 id={`cat-${category}`} className="text-lg font-semibold capitalize">{category}</h2>
            <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <li key={item.id} className="flex flex-col overflow-hidden rounded-xl border bg-surface">
                  <img
                    src={item.cartoonURL}
                    alt={`${category} item`}
                    loading="lazy"
                    className="aspect-square w-full bg-subtle object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => deleteItem(item.id)}
                    disabled={deletingId === item.id}
                    className="btn btn-ghost m-2 text-danger hover:text-danger"
                  >
                    {deletingId === item.id && <span className="spinner" aria-hidden="true" />}
                    {deletingId === item.id ? 'Removing...' : 'Remove'}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function EmptyState({ title, body, action, tone }) {
  return (
    <div className="card flex flex-col items-center gap-4 py-12 text-center">
      <h2 className={`text-lg font-semibold ${tone === 'danger' ? 'text-danger' : ''}`}>{title}</h2>
      <p className="max-w-prose text-muted">{body}</p>
      {action}
    </div>
  );
}

export default Fashion;
