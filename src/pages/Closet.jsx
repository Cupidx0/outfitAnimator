import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc } from "firebase/firestore";
import { useAuth } from './AuthContext';
import { db } from '../utils/firebase';

function Fashion() {
  const [closet, setCloset] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const handleCloset = async () => {
      if (!user?.uid) return;
      const closetRef = collection(db, "closet");
      const q = query(closetRef, where("userId", "==", user.uid));
      try {
        const querySnapshot = await getDocs(q);
        const closetItems = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setCloset(closetItems);
      } catch (err) {
        console.error('error:', err);
      }
    };
    handleCloset();
  }, [user]);

  const deleteDocField = async (docId) => {
    const docRef = doc(db, 'closet', docId);
    try {
      await deleteDoc(docRef);
      console.log('Item deleted successfully.');
      setCloset(prev => prev.filter(item => item.id !== docId));
    } catch (err) {
      console.error('error deleting item', err);
    }
  };

  const groupCloset = closet.reduce((groups, item) => {
    const category = item.category || "uncategorized";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
    return groups;
  }, {});

  return (
    <div className="flex flex-col bg-black w-full">
      <article className="p-3 text-xl font-bold text-white">
        <h2>Fit Closet</h2>
      </article>
      <div className="flex flex-col p-5 m-6 bg-black gap-4 max-h-[500px] rounded-md border border-white overflow-auto">
        {Object.entries(groupCloset).map(([category, items]) => (
          <section key={category} className="p-4 m-4 border border-white rounded-md">
            <h3 className="text-white text-lg font-semibold mb-3 capitalize">{category}</h3>
            <div className="flex flex-wrap gap-4">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col items-center">
                  <img
                    src={item.cartoonURL}
                    alt={category}
                    className="w-32 h-32 object-cover rounded-md"
                  />
                  <button
                    onClick={() => deleteDocField(item.id)}
                    className="text-red-500 hover:underline mt-2"
                  >
                    Remove Item
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export default Fashion;
