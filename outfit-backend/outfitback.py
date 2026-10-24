from io import BytesIO

from flask import Flask, request, jsonify,g
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename
from functools import wraps, lru_cache
from collections import Counter
from urllib.parse import unquote, urlparse
import json
import os
import shutil
import tempfile
import traceback
import uuid
import logging
from google import genai
from PIL import Image
import base64
import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, storage, firestore, auth as firebase_auth
from google.api_core.exceptions import NotFound
import openai
import requests
import cv2
import numpy as np
from sklearn.cluster import KMeans
import webcolors
from colour import delta_E
from colour.models import RGB_to_XYZ, XYZ_to_Lab

load_dotenv()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
api_key = os.getenv("OPENWEATHER_API_KEY")
DEFAULT_CITY = "London"
log = logging.getLogger(__name__)
log.setLevel(logging.INFO)
BUCKET_NAME = os.getenv("FIREBASE_STORAGE_BUCKET", "outfitgenerator-d60a5.firebasestorage.app")
SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "outfitstyle.json")
CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
IMAGE_MODEL = os.getenv("GEMINI_IMAGE_MODEL", "gemini-nano-banana-2.1")
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "https://outfit-animator.vercel.app,http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173",
).split(",")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
# Must match the category values offered by the frontend.
CATEGORIES = {"top", "hoodies", "coat", "trouser", "short", "cap"}
UPPER_CATEGORIES = {"top", "hoodies", "coat"}
LOWER_CATEGORIES = {"trouser", "short"}
MAX_REFERENCE_IMAGES = 4

try:
    firebase_admin.initialize_app(
        credentials.Certificate(SERVICE_ACCOUNT_PATH), {"storageBucket": BUCKET_NAME}
    )
    print(f"Firebase Admin SDK initialized with bucket {BUCKET_NAME}")
except Exception as e:
    # Routes that need Firebase will fail with a 500 until this is fixed.
    print(f"Error initializing Firebase Admin from {SERVICE_ACCOUNT_PATH}: {e}")

outfitback = Flask(__name__)
outfitback.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES
CORS(
    outfitback,
    origins=ALLOWED_ORIGINS,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "DELETE", "OPTIONS"],
)


def get_db():
    return firestore.client()


@lru_cache(maxsize=1)
def get_openai():
    return openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


@lru_cache(maxsize=1)
def get_gemini():
    # Created on first use so the app (and the tests) can start without a key.
    return genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def gemini_image(prompt_input):
    """Runs the Gemini image model and returns the image as bytes."""
    interaction = get_gemini().interactions.create(model=IMAGE_MODEL, input=prompt_input)
    data = interaction.output_image.data
    return base64.b64decode(data) if isinstance(data, str) else bytes(data)


@outfitback.errorhandler(Exception)
def handle_error(e):
    # Let Flask's own HTTP errors (404, 405, 413...) through; hide everything else.
    if isinstance(e, HTTPException):
        return jsonify({"error": e.description}), e.code
    traceback.print_exc()
    return jsonify({"error": "Internal server error"}), 500


def require_auth(view):
    """Rejects requests without a valid Firebase ID token and exposes the caller as g.uid."""
    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify({"error": "Missing auth token"}), 401
        try:
            g.uid = firebase_auth.verify_id_token(header[len("Bearer "):])["uid"]
        except Exception:
            log.exception("verify_id_token failed")
            return jsonify({"error": "Invalid or expired auth token"}), 401
        return view(*args, **kwargs)
    return wrapper


@outfitback.route('/')
def hello():
    return 'Backend is running now'


def get_weather(city=DEFAULT_CITY, lat=None, lon=None):
    """Current weather by coordinates when given, otherwise by city. Returns None on failure."""
    if lat is not None and lon is not None:
        params = {"lat": lat, "lon": lon}
    else:
        params = {"q": city or DEFAULT_CITY}
    try:
        response = requests.get(
            "https://api.openweathermap.org/data/2.5/weather",
            params={**params, "appid": api_key, "units": "metric"},
            timeout=10,
        )
    except requests.RequestException as e:
        print(f"Weather request failed: {e}")
        return None
    if response.status_code != 200:
        print(f"Weather request returned {response.status_code}")
        return None
    data = response.json()
    return {
        "city": data.get("name"),
        "temp": data["main"]["temp"],
        "weather": data["weather"][0]["main"],
        "description": data["weather"][0]["description"],
        "icon": data["weather"][0]["icon"],
    }


@outfitback.route("/weather", methods=["GET"])
@outfitback.route("/weather-by-coords", methods=["GET"])
def get_weather_route():
    weather_data = get_weather(
        request.args.get("city"), request.args.get("lat"), request.args.get("lon")
    )
    if not weather_data:
        return jsonify({"error": "Weather data not found"}), 502
    return jsonify(weather_data)


def choose_outfit_by_weather(temp):
    if temp < 10:
        return "Heavy coat, hoodie, scarf"
    elif temp < 18:
        return "Hoodie or light jacket"
    elif temp < 25:
        return "T-shirt or long sleeve"
    else:
        return "Shorts and t-shirt"


def get_weather_tag(temp):
    if temp is None:
        return "unknown"
    if temp < 10:
        return 'cold'
    elif temp < 18:
        return 'cool'
    elif temp < 25:
        return 'warm'
    else:
        return 'hot'


def infer_weather_tag_from_category(category):
    category = (category or "").lower()
    if category in ["coat", "sweater", "jacket"]:
        return "cold"
    elif category in ["t-shirt", "short", "tank top"]:
        return "warm"
    elif category in ["trouser", "jeans", "long pants", "long-sleeve shirt", "hoodies"]:
        return "cool"
    else:
        return "all-weather"


@outfitback.route('/outfit-suggestion')
def outfit_suggestion():
    city = request.args.get('city', DEFAULT_CITY)
    weather = get_weather(city, request.args.get("lat"), request.args.get("lon"))
    if not weather:
        return jsonify({"error": "Could not retrieve weather data."}), 502
    return jsonify({
        "city": city,
        "temp": weather["temp"],
        "weather": weather["weather"],
        "suggested_outfit": choose_outfit_by_weather(weather["temp"]),
    })


def upload_public(data, path, content_type):
    blob = storage.bucket().blob(path)
    blob.upload_from_string(data, content_type=content_type)
    blob.make_public()
    return blob.public_url


STYLIST_PROMPT = """You are a personal stylist. You build one outfit from the user's own closet for the occasion they describe and today's weather.

How to build it:
- A complete outfit has one bottom (trouser or short) and at least one upper layer (top, hoodies, coat). A cap is optional.
- Weather comes first. Layer up when it is cold. Skip coats and hoodies when it is hot, and skip shorts when it is cold.
- The occasion comes second. Match the formality and vibe the user asked for.
- Coordinate colours: build on neutrals or one base colour and add at most one accent. Closet colours were read from photos, so they are approximate and can include the photo background. Use the colour that makes sense for the garment.
- Only pick items that are in the closet list, by their id. Never invent closet items or change their colours.
- If the closet cannot make a complete, weather-appropriate outfit, put the gap in "missing" with a specific suggestion, e.g. "slim dark-wash jeans". Do not list pieces the closet already covers.
- The closet cannot store shoes or accessories, so recommend those in "extras", never in "missing".
- If the closet is empty, design a full outfit and put every garment in "missing".
- If the request has nothing to do with clothing or getting dressed, set "off_topic" to true and leave the lists empty.

Reply with a JSON object only:
{
  "off_topic": false,
  "title": "name for the look, at most 6 words",
  "summary": "2 or 3 friendly sentences on why this works for the weather and the occasion. A light joke is welcome.",
  "items": [{"id": 1, "why": "one short reason this piece earns its place"}],
  "missing": [{"piece": "specific garment with colour and cut", "why": "the gap it fills"}],
  "extras": ["shoes or accessories that finish the look"],
  "image_prompt": "visual description of every garment in the outfit (closet pieces and missing ones) with colour, cut and fabric, for an illustrator. Clothes only: no people, no text."
}"""

OFF_TOPIC_REPLY = "Sorry, I can only help with outfit suggestions."


def describe_closet_item(number, item):
    colours = [
        f"{c['name']} ({round(c.get('percentage', 0))}%)"
        for c in item.get("dominantColors") or []
        if c.get("name")
    ]
    return {
        "id": number,
        "category": item.get("category", "unknown"),
        "colours": colours or ["unknown"],
        "warmth": item.get("weather_Tag", "all-weather"),
    }


def build_stylist_request(prompt_text, closet, weather, city):
    if weather:
        weather_line = (
            f"{weather['temp']:.0f}°C and {weather['description']} in {weather.get('city') or city} "
            f"({get_weather_tag(weather['temp'])})."
        )
    else:
        weather_line = "Unknown. Pick something that works across mild weather."
    return (
        f"Occasion: {prompt_text}\n"
        f"Weather: {weather_line}\n"
        f"Closet: {json.dumps(closet) if closet else 'empty'}"
    )


def parse_stylist_reply(raw, closet_docs):
    """Validates the model's JSON so the rest of the route can trust it. Raises ValueError on junk."""
    reply = json.loads(raw)
    if not isinstance(reply, dict):
        raise ValueError("Stylist reply is not an object")

    used, seen = [], set()
    for entry in reply.get("items") or []:
        number = entry.get("id") if isinstance(entry, dict) else entry
        # The model sometimes sends ids as strings.
        if isinstance(number, str) and number.strip().isdigit():
            number = int(number)
        if isinstance(number, int) and 1 <= number <= len(closet_docs) and number not in seen:
            seen.add(number)
            doc = closet_docs[number - 1]
            if doc["cartoonURL"]:
                why = entry.get("why", "") if isinstance(entry, dict) else ""
                used.append({**doc, "why": str(why).strip()})

    missing = []
    for entry in reply.get("missing") or []:
        piece = entry.get("piece") if isinstance(entry, dict) else entry
        if piece and str(piece).strip().lower() not in ("none", "n/a", "nothing"):
            why = entry.get("why", "") if isinstance(entry, dict) else ""
            missing.append({"piece": str(piece).strip(), "why": str(why).strip()})

    return {
        "off_topic": bool(reply.get("off_topic")),
        "title": str(reply.get("title") or "").strip(),
        "summary": str(reply.get("summary") or "").strip(),
        "items": used,
        "missing": missing,
        "extras": [str(x).strip() for x in reply.get("extras") or [] if str(x).strip()],
        "image_prompt": str(reply.get("image_prompt") or "").strip(),
    }


def covers_outfit(items):
    categories = {item["category"] for item in items}
    return bool(categories & UPPER_CATEGORIES) and bool(categories & LOWER_CATEGORIES)


def fetch_reference_images(items):
    """Downloads the stylized closet pieces so the illustration can match them."""
    parts = []
    for item in items[:MAX_REFERENCE_IMAGES]:
        try:
            r = requests.get(item["cartoonURL"], timeout=15)
            r.raise_for_status()
        except requests.RequestException:
            log.warning("Could not fetch reference image %s", item["id"])
            continue
        parts.append({
            "type": "image",
            "data": base64.b64encode(r.content).decode("utf-8"),
            "mime_type": r.headers.get("Content-Type", "image/png").split(";")[0],
        })
    return parts


def generate_image(description, references, uid):
    text = (
        "Flat-lay fashion illustration of one complete outfit on a plain light background, "
        "styled like a lookbook page. Show every garment fully with realistic fabric, lighting and proportions. "
        "No people, no mannequin heads, no text or logos.\n"
        f"Outfit: {description}"
    )
    if references:
        text += (
            "\nThe attached images are pieces from the user's own closet. "
            "Draw those pieces exactly as they look, keeping their colours and details, "
            "and add the other garments described above."
        )
    data = gemini_image([{"type": "text", "text": text}, *references])
    return upload_public(data, f"generated/{uid}/{uuid.uuid4().hex}.png", "image/png")


@outfitback.route('/generate_outfit_from_closet', methods=['POST'])
@require_auth
def generate_outfit_from_closet():
    data = request.get_json(silent=True) or {}
    prompt_text = str(data.get("prompt", "")).strip()[:500]
    if not prompt_text:
        return jsonify({"error": "Missing prompt"}), 400
    city = data.get("city") or DEFAULT_CITY

    weather = get_weather(city, data.get("lat"), data.get("lon"))
    temp = weather["temp"] if weather else None
    if weather and weather.get("city"):
        city = weather["city"]

    # Items are numbered so the model can point at them without seeing Firestore ids.
    closet, closet_docs = [], []
    for doc in get_db().collection("closet").where("userId", "==", g.uid).stream():
        item = doc.to_dict()
        closet_docs.append({"id": doc.id, "category": item.get("category"), "cartoonURL": item.get("cartoonURL")})
        closet.append(describe_closet_item(len(closet_docs), item))

    try:
        response = get_openai().chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": STYLIST_PROMPT},
                {"role": "user", "content": build_stylist_request(prompt_text, closet, weather, city)},
            ],
            response_format={"type": "json_object"},
            max_tokens=700,
            temperature=0.7,
        )
        outfit = parse_stylist_reply(response.choices[0].message.content, closet_docs)
    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Outfit generation failed"}), 502

    result = {
        "title": outfit["title"],
        "outfit_idea": outfit["summary"],
        "closet_items": outfit["items"],
        "missing": outfit["missing"],
        "extras": outfit["extras"],
        "image_url": None,
        "temp": temp,
        "weather_tag": get_weather_tag(temp),
        "city": city,
    }
    if outfit["off_topic"]:
        return jsonify({**result, "title": "", "outfit_idea": OFF_TOPIC_REPLY,
                        "closet_items": [], "missing": [], "extras": []})

    # Only draw a picture when the closet can't show the whole look by itself.
    if outfit["missing"] or not covers_outfit(outfit["items"]):
        description = outfit["image_prompt"] or outfit["summary"]
        try:
            result["image_url"] = generate_image(description, fetch_reference_images(outfit["items"]), g.uid)
        except Exception:
            # The text idea is still useful without a picture.
            traceback.print_exc()
    return jsonify(result)


def normalise_image(raw: bytes, max_side=1024) -> bytes:
    img = Image.open(BytesIO(raw))
    img = img.convert("RGB")           # drops alpha/odd modes
    img.thumbnail((max_side, max_side))
    out = BytesIO()
    img.save(out, format="JPEG", quality=90)
    return out.getvalue()
def resize_image(filepath, max_size=512):
    img = cv2.imread(filepath)
    if img is None:
        raise ValueError("Unreadable image")
    height, width = img.shape[:2]
    # Scale while maintaining aspect ratio
    scale = max_size / max(height, width)
    resized_img = cv2.resize(img, (int(width * scale), int(height * scale)))
    cv2.imwrite(filepath, resized_img)


with open(os.path.join(BASE_DIR, "colors.json")) as f:
    CSS3_NAMES_TO_HEX = json.load(f)


def rgb_to_lab(rgb):
    return XYZ_to_Lab(RGB_to_XYZ(np.array(rgb) / 255.0, 'sRGB'))


@lru_cache(maxsize=1)
def css_color_labs():
    return {
        name: rgb_to_lab(tuple(int(hex_val.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4)))
        for name, hex_val in CSS3_NAMES_TO_HEX.items()
    }


def closest_color(rgb):
    """Exact CSS colour name if there is one, otherwise the nearest by CIEDE2000."""
    try:
        return webcolors.rgb_to_name(rgb, spec='css3')
    except ValueError:
        target_lab = rgb_to_lab(rgb)
        return min(css_color_labs().items(), key=lambda kv: delta_E(target_lab, kv[1], method='CIE 2000'))[0]


def extract_dominant_colors(filepath, k=3):
    img = cv2.imread(filepath, cv2.IMREAD_UNCHANGED)
    if len(img.shape) == 2 or img.shape[-1] == 1:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    elif img.shape[-1] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)

    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_flat = cv2.resize(img, (64, 64)).reshape(-1, 3)

    kmeans = KMeans(n_clusters=k, n_init=10)
    labels = kmeans.fit_predict(img_flat)
    centers = kmeans.cluster_centers_.astype(int)
    counts = Counter(labels)
    total = sum(counts.values())

    results = []
    for idx, center in enumerate(centers):
        rgb = tuple(int(c) for c in center)
        results.append({
            "name": closest_color(rgb),
            "rgb": rgb,
            "hex": webcolors.rgb_to_hex(rgb),
            "percentage": float(round((counts[idx] / total) * 100, 2)),
        })
    results.sort(key=lambda x: -x["percentage"])
    return results


@outfitback.route('/cartoonize', methods=['POST'])
@require_auth
def cartoonize():
    file = request.files.get('image')
    category = request.form.get("category", "")
    if not file or not file.filename:
        return jsonify({"error": "Missing image"}), 400
    if not (file.mimetype or "").startswith("image/"):
        return jsonify({"error": "File must be an image"}), 400
    if category not in CATEGORIES:
        return jsonify({"error": "Unknown category"}), 400

    # Each request gets its own folder so concurrent uploads never share files.
    workdir = tempfile.mkdtemp()
    try:
        filename = secure_filename(file.filename) or "upload.jpg"
        filepath = os.path.join(workdir, filename)
        file.save(filepath)
        with open(filepath, "rb") as f:
            original_bytes = f.read()
        try:
            resize_image(filepath)
        except ValueError:
            return jsonify({"error": "Unsupported image format. Try a JPG or PNG."}), 400

        with open(filepath, "rb") as f:
            image_bytes = f.read()

        cartoon_bytes = gemini_image([
            {
                "type": "text",
                "text": (
                    "Recreate this clothing item as a clean, realistic product illustration on a plain white background. "
                    "Keep its exact colours, pattern, logos and cut. Show only the garment, centred and fully visible: "
                    "no person, hanger or other objects."
                ),
            },
            {
                "type": "image",
                "data": base64.b64encode(image_bytes).decode("utf-8"),
                # resize_image keeps the upload's format.
                "mime_type": file.mimetype,
            },
        ])

        uid = g.uid
        file_id = uuid.uuid4().hex
        # Originals stay private; only the stylized version is public.
        original_path = f"users/{uid}/{category}/{file_id}_{filename}"
        storage.bucket().blob(original_path).upload_from_string(original_bytes, content_type=file.mimetype)
        cartoon_path = f"cartoonized/{file_id}_{os.path.splitext(filename)[0]}.png"
        cartoon_url = upload_public(cartoon_bytes, cartoon_path, "image/png")

        dominant_colors = extract_dominant_colors(filepath)
        weather_tag = infer_weather_tag_from_category(category)
        doc_ref = get_db().collection("closet").document()
        doc_ref.set({
            "userId": uid,
            "originalPath": original_path,
            "cartoonPath": cartoon_path,
            "category": category,
            "weather_Tag": weather_tag,
            "cartoonURL": cartoon_url,
            "dominantColors": dominant_colors,
            "timestamp": firestore.SERVER_TIMESTAMP,
        })
        return jsonify({
            "id": doc_ref.id,
            "cartoonUrl": cartoon_url,
            "weather_Tag": weather_tag,
        })
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


@outfitback.route('/closet', methods=['GET'])
@require_auth
def list_closet():
    items = []
    for doc in get_db().collection("closet").where("userId", "==", g.uid).stream():
        item = doc.to_dict()
        items.append({
            "id": doc.id,
            "category": item.get("category"),
            "dominantColors": item.get("dominantColors"),
            "cartoonURL": item.get("cartoonURL"),
            "timestamp": item.get("timestamp"),
        })
    # Newest first; very old items may have no timestamp.
    items.sort(key=lambda i: (i["timestamp"] is not None, i["timestamp"] or 0), reverse=True)
    for item in items:
        item.pop("timestamp")
    return jsonify({"items": items})


def blob_path_from_url(url):
    """Storage path from a public GCS URL or a Firebase download URL (older items only store URLs)."""
    if not url:
        return None
    parsed = urlparse(url)
    if parsed.netloc == "storage.googleapis.com":
        parts = parsed.path.lstrip("/").split("/", 1)
        return unquote(parts[1]) if len(parts) == 2 else None
    if parsed.netloc == "firebasestorage.googleapis.com" and "/o/" in parsed.path:
        return unquote(parsed.path.split("/o/", 1)[1])
    return None


@outfitback.route('/closet/<item_id>', methods=['DELETE'])
@require_auth
def delete_closet_item(item_id):
    doc_ref = get_db().collection("closet").document(item_id)
    snapshot = doc_ref.get()
    item = snapshot.to_dict() if snapshot.exists else None
    if not item or item.get("userId") != g.uid:
        return jsonify({"error": "Item not found"}), 404

    paths = [
        item.get("originalPath") or blob_path_from_url(item.get("originalUrl")),
        item.get("cartoonPath") or blob_path_from_url(item.get("cartoonURL")),
    ]
    bucket = storage.bucket()
    for path in paths:
        # Only ever delete files that belong to this user's uploads.
        if path and (path.startswith(f"users/{g.uid}/") or path.startswith("cartoonized/")):
            try:
                bucket.blob(path).delete()
            except NotFound:
                pass
    doc_ref.delete()
    return "", 204


if __name__ == '__main__':
    outfitback.run(debug=True,port=5000)
