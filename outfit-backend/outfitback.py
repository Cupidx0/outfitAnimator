from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.exceptions import HTTPException
from werkzeug.utils import secure_filename
from functools import wraps, lru_cache
from collections import Counter
from urllib.parse import unquote, urlparse
import base64
import json
import os
import shutil
import tempfile
import traceback
import uuid

import replicate
import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, storage, firestore, auth as firebase_auth
from google.api_core.exceptions import NotFound
from openai import OpenAI
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
BUCKET_NAME = os.getenv("FIREBASE_STORAGE_BUCKET", "outfitgenerator-d60a5.firebasestorage.app")
SERVICE_ACCOUNT_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "/etc/secrets/outfitstyle.json")
CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4")
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "dall-e-3")
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS", "https://outfit-animator.vercel.app,http://localhost:5173"
).split(",")
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
# Must match the category values offered by the frontend.
CATEGORIES = {"top", "hoodies", "coat", "trouser", "short", "cap"}
CARTOONIFY_MODEL = "catacolabs/cartoonify:f109015d60170dfb20460f17da8cb863155823c85ece1115e1e9e4ec7ef51d3b"

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
rep_client = replicate.Client(api_token=os.getenv("REPLICATE_API_KEY"))


def get_db():
    return firestore.client()


@lru_cache(maxsize=1)
def get_openai():
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


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


def generate_image(prompt_text, uid):
    """Generates an image and copies it to Firebase Storage, since OpenAI's URLs expire after an hour."""
    options = {"response_format": "b64_json"} if IMAGE_MODEL.startswith("dall-e") else {}
    response = get_openai().images.generate(
        model=IMAGE_MODEL, prompt=prompt_text, n=1, size="1024x1024", **options
    )
    image_bytes = base64.b64decode(response.data[0].b64_json)
    return upload_public(image_bytes, f"generated/{uid}/{uuid.uuid4().hex}.png", "image/png")


@outfitback.route('/generate_outfit_from_closet', methods=['POST'])
@require_auth
def generate_outfit_from_closet():
    data = request.get_json(silent=True) or {}
    prompt_text = str(data.get("prompt", "")).strip()[:500]
    if not prompt_text:
        return jsonify({"error": "Missing prompt"}), 400
    city = data.get("city") or DEFAULT_CITY

    weather_data = get_weather(city, data.get("lat"), data.get("lon"))
    temp = weather_data["temp"] if weather_data else None
    weather_tag = get_weather_tag(temp)

    # Get user's closet items
    closet_items = []
    all_colors = []
    for doc in get_db().collection("closet").where("userId", "==", g.uid).stream():
        item = doc.to_dict()
        category = item.get("category", "unknown")
        filtered_colors = []
        for color in item.get("dominantColors") or []:
            name = color.get("name")
            percentage = color.get("percentage", 0)
            if name and percentage < 50:
                filtered_colors.append(name)
                all_colors.append((name, percentage))
        closet_items.append(
            f"({category}) ({','.join(filtered_colors) if filtered_colors else 'mixed'}) ({item.get('weather_Tag', 'unknown')})"
        )
    closet_empty = len(closet_items) == 0
    closet_text = ", ".join(closet_items) if closet_items else "no clothing items available"

    # Unique colour names, least dominant first
    unique_color_names = list(dict.fromkeys(name for name, _ in sorted(all_colors, key=lambda x: x[1])))
    colors_description = ", ".join(unique_color_names) if unique_color_names else "no specific colors"

    excluded_items = ""
    if temp is not None and temp >= 22:
        excluded_items = "coats, hoodies"
    elif temp is not None and temp <= 10:
        excluded_items = "short, tank tops"
    weather_line = f"Weather: {weather_tag}, temperature: {temp}°C." if temp is not None else "Weather: unknown."

    prompt = (
        f"Users special request: {prompt_text}.\n"
        "You are a fashion assistant. Based on the user’s request, the closet items, and the current weather, suggest a complete outfit.\n"
        "Use 3 to 5 items from the closet covering each category (e.g., top, bottom, shoes, accessory).\n"
        f"Closet items: {closet_text}.\n"
        "If the closet is empty, create a new outfit idea based on the weather.\n"
        f"{weather_line}\n"
        f"Prominent closet colors: {colors_description}.\n"
        f"{'Exclude items like ' + excluded_items + '.' if excluded_items else ''}\n"
        "Use color coordination and include at least one accent color (low-percentage color).\n"
        "Only use closet colors that match appropriate clothing category.\n"
        "Do not assign colors from a category to another category while giving ideas.\n"
        "Example: a black top, blue jeans, and white sneakers.\n"
        "Start with a short sentence about the temperature.\n"
        "Make funny comment about the outfit where necessary.\n"
        "Only use available closet items if any exist.\n"
        "If the input is unrelated to fashion, reply: 'Sorry, I can only help with outfit suggestions.'\n"
        "Suggest an outfit:"
    )
    try:
        response = get_openai().chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": "You're a virtual stylist helping users pick outfits based on weather and closet items."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=180,
            temperature=0.6,
        )
        idea = response.choices[0].message.content.strip()
    except Exception:
        traceback.print_exc()
        return jsonify({"error": "Outfit generation failed"}), 502

    if closet_empty:
        image_prompt = (
            f"Full-body fashion illustration of a modern outfit that includes: {idea}. "
            f"Styled for {weather_tag} weather, realistic lighting, plain background, "
            "professional editorial photo aesthetic, contemporary fashion photography. "
            "Generate life like images for the output."
        )
    else:
        image_prompt = f"Fashion illustration of {idea}, flat design, white background, detailed"
    try:
        image_url = generate_image(image_prompt, g.uid)
    except Exception:
        # The text idea is still useful without a picture.
        traceback.print_exc()
        image_url = None

    return jsonify({
        "outfit_idea": idea,
        "image_url": image_url,
        "temp": temp,
        "weather_tag": weather_tag,
        "city": city,
    })


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

        with open(filepath, "rb") as image:
            output = rep_client.run(
                CARTOONIFY_MODEL,
                input={
                    "image": image,
                    "prompt": "A cartoon-style version of the uploaded clothing item without changing the text on the clothing item",
                    "aspect_ratio": "16:9",
                },
            )
        cartoon_source = str(output[0] if isinstance(output, (list, tuple)) else output)
        r = requests.get(cartoon_source, timeout=60)
        if r.status_code != 200:
            print(f"Error downloading cartoon image: Status {r.status_code}")
            return jsonify({"error": "Stylizing the image failed. Please try again."}), 502

        uid = g.uid
        file_id = uuid.uuid4().hex
        # Originals stay private; only the stylized version is public.
        original_path = f"users/{uid}/{category}/{file_id}_{filename}"
        storage.bucket().blob(original_path).upload_from_string(original_bytes, content_type=file.mimetype)
        cartoon_path = f"cartoonized/{file_id}_{filename}"
        cartoon_url = upload_public(r.content, cartoon_path, r.headers.get("Content-Type", "image/jpeg"))

        dominant_colors = extract_dominant_colors(filepath)
        city = request.form.get("city") or DEFAULT_CITY
        weather_data = get_weather(city, request.form.get("lat"), request.form.get("lon"))
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
            "temp": weather_data["temp"] if weather_data else None,
            "city": city,
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
    outfitback.run(debug=True)
