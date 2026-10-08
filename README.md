# OutfitGen

Upload photos of your clothes, then ask for an outfit. OutfitGen stylizes each item, reads its colours, and suggests an outfit from your closet that suits the occasion and today's weather.

- **Frontend:** React, Vite and Tailwind in `src/`, deployed on Vercel.
- **Backend:** Flask in `outfit-backend/`. It uses Firebase Admin, OpenAI, Replicate and OpenWeather.

The browser only talks to Firebase for sign in. Everything else goes through the backend, which checks the user's Firebase ID token on every request.

## Frontend

```bash
npm install
npm run dev
```

Set these in `.env` locally and in Vercel:

| Variable | Purpose |
| --- | --- |
| `VITE_BACKEND_URL` | Base URL of the Flask backend |
| `VITE_CONTACT_EMAIL` | Optional. Shows contact links in the footer, FAQ, Terms and Privacy pages |

Sign ups are controlled by `SIGNUPS_OPEN` in `src/utils/firebase.js`. That flag only changes the UI. To enforce it, also turn off **Enable create (sign-up)** in Firebase Console > Authentication > Settings > User actions.

## Backend

Requires Python 3.11.

```bash
cd outfit-backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python outfitback.py        # local dev
gunicorn outfitback:outfitback   # production
pytest                      # tests
```

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Outfit ideas and images |
| `REPLICATE_API_KEY` | Stylizing clothing photos |
| `OPENWEATHER_API_KEY` | Weather lookups |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Path to the service account JSON. Defaults to `/etc/secrets/outfitstyle.json` |
| `FIREBASE_STORAGE_BUCKET` | Defaults to `outfitgenerator-d60a5.firebasestorage.app` |
| `ALLOWED_ORIGINS` | Comma separated CORS origins. Defaults to the Vercel site and `http://localhost:5173` |
| `OPENAI_CHAT_MODEL` / `OPENAI_IMAGE_MODEL` | Optional model overrides. Default `gpt-4` and `dall-e-3` |

## Firebase rules

`firestore.rules` and `storage.rules` deny all direct browser access, since the backend uses the Admin SDK. Paste them into the Firebase Console (Firestore > Rules and Storage > Rules), or deploy them with the Firebase CLI.
