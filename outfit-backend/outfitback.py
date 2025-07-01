from flask import Flask, request,jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import replicate
import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, storage,firestore
import uuid
import os
import openai
import requests
import cv2
import numpy as np
from sklearn.cluster import KMeans
import webcolors
import colour  # this is the actual colorscience library
from colour import delta_E
from colour.utilities import as_float_array
from colour.models import RGB_to_XYZ, XYZ_to_Lab
from collections import Counter
import json
  # If this works
load_dotenv()
api_key = os.getenv("OPENWEATHER_API_KEY")
city = "London"
openai.api_key = os.getenv("OPENAI_API_KEY")
service_account_key_path = "/etc/secrets/outfitstyle.json"
if not service_account_key_path:
    print(f"Error: Service account key file not found at {service_account_key_path}")
    # Handle error or exit
else:
    try:
        cred = credentials.Certificate(service_account_key_path)
        bucket_name = 'outfitgenerator-d60a5.firebasestorage.app' # <-- Make sure this is .com here!

        # *** Add this line to print the value being used ***
        print(f"Initializing Firebase Admin with storageBucket: {bucket_name}")
        # *****************************************************

        firebase_admin.initialize_app(cred, {
            'storageBucket': bucket_name # Use the variable
        })
        print("Firebase Admin SDK initialized successfully!")
    except Exception as e:
        print(f"Error initializing Firebase Admin: {e}")
db = firestore.client()
print("Firestore client obtained!")
outfitback = Flask(__name__)
CORS(outfitback, resources={r"/*": {"origins": "https://outfit-animator.vercel.app"}}, supports_credentials=True)
#replicate Ai
os.environ["REPLICATE_API_TOKEN"] = os.getenv("REPLICATE_API_KEY")
rep_client = replicate.Client(api_token=os.getenv("REPLICATE_API_TOKEN"))
#model = replicate.models.get("catacolabs/cartoonify")
#version = model.versions.get("f109015d60170dfb20460f17da8cb863155823c85ece1115e1e9e4ec7ef51d3b")
#prompt = "A cartoon-style version of the uploaded clothing item."
@outfitback.route('/')
def hello():
    return 'Backend is running now'
@outfitback.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

def get_weather(city, api_key):
    url = f"https://api.openweathermap.org/data/2.5/forecast?units=metric&q={city}&appid={api_key}"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        forecast = data["list"][0]
        return{
            "temp": forecast["main"]["temp"],
            "weather":forecast["weather"][0]["main"],
            "description":forecast["weather"][0]["description"],
            "icon":forecast["weather"][0]["icon"]
        }
    else:
        return{"error":"weather data not found"}
weather = get_weather(city, api_key)
print(weather)
def get_weather_by_coords(lat, lon, api_key):
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
    response = requests.get(url)
    if response.status_code == 200:
        data = response.json()
        return {
            "temp": data["main"]["temp"],
            "weather": data["weather"][0]["main"],
            "description": data["weather"][0]["description"],
            "icon": data["weather"][0]["icon"]
        }
    else:
        return {"error": "weather data not found"}

@outfitback.route("/weather-by-coords", methods=["GET"])
def get_weather_by_coords_route():
    lat = request.args.get('lat')
    lon = request.args.get('lon')

    if not lat or not lon:
        return jsonify({"error": "Missing latitude or longitude"}), 400

    try:
        weather_data = get_weather_by_coords(lat, lon, api_key)
        return jsonify(weather_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
@outfitback.route("/weather", methods=["GET"])
def get_weather_route():
    city = request.args.get('city')
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    api_key = api_key
    if lat and lon:
        weather_data = get_weather_by_coords(lat, lon, api_key)
    else:
        weather_data = get_weather(city, api_key)
    return jsonify(weather_data)
def choose_outfit_by_weather(temp):
    if temp < 10:
        return "Heavy coat, hoodie, scarf"
    elif 10 <= temp < 18:
        return "Hoodie or light jacket"
    elif 18 <= temp < 25:
        return "T-shirt or long sleeve"
    else:
        return "Shorts and t-shirt"
def get_oufit_tag(temp):
    if temp is None:
        return "unknown"
    if temp < 10:
        return 'cold'
    elif 10<= temp < 18:
        return 'cool'
    elif 18<= temp < 25:
        return 'warm'
    else:
        return 'hot'
def infer_weather_tag_from_category(category):
    category = category.lower()
    if category in ["coat", "sweater", "jacket"]:
        return "cold"
    elif category in ["t-shirt", "short", "tank top"]:
        return "warm"
    elif category in ["jeans", "long pants", "long-sleeve shirt", "hoodies"]:
        return "cool"
    else:
        return "all-weather"
@outfitback.route('/outfit-suggestion')
def outfit_suggestion():
    city = request.args.get('city', 'London')
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if lat and lon:
        weather = get_weather_by_coords(lat, lon, api_key)
    else:
        weather = get_weather(city, api_key)
    temp = weather.get("temp") if weather else None
    
    weather_tag = get_oufit_tag(temp)
    if "temp" in weather:
        outfit = choose_outfit_by_weather(weather["temp"])
        return jsonify({
            "city": city,
            "temp": weather["temp"],
            "weather": weather["weather"],
            "suggested_outfit": outfit
        })
    else:
        return jsonify({"error": "Could not retrieve weather data."}), 400
@outfitback.route('/generate-outfit-from-closet', methods=['POST'])
def generate_outfit_from_closet():
    try:
        data = request.get_json()
        user_id = data.get("userId")
        city = data.get("city", "London")
        lat = data.get("lat")
        lon = data.get("lon")
        
        category = data.get("category", "unknown")
        dominant_colors = data.get("dominantColors")
        if not user_id:
            return jsonify({"error": "Missing userId"}), 400

        # Get weather
        if lat and lon:
            weather_data = get_weather_by_coords(lat, lon, api_key)
        else:
            weather_data = get_weather(city, api_key)
        temp = weather_data.get("temp")
        weather_tag = infer_weather_tag_from_category(category)
        weather_fit =  outfit_suggestion()
        # Get user's closet items
        closet_items = []
        docs = db.collection("closet").where("userId", "==", user_id).stream()
        for doc in docs:
            item = doc.to_dict()
            category = item.get("category","unknown")
            dominant_colors = item.get("dominantColors",[])
            all_colors = []
            filtered_colors = []
            if isinstance(dominant_colors, list):
                for color in dominant_colors:
                    name = color.get("name")
                    percentage = color.get("percentage", 0)
                    if name and percentage < 50:
                        filtered_colors.append(name)
                        all_colors.append((name, percentage))
            closet_items.append(
                f"({category}) ({',' .join(filtered_colors) if filtered_colors else 'mixed'}) ({item.get('weather_Tag', 'unknown')})"
            )

        closet_text = ", ".join(closet_items) if closet_items else "no clothing items available"

        # Sort by percentage and get unique colors
        sorted_colors = sorted(all_colors, key=lambda x: x[1])  # sort by percentage ascending
        unique_color_names = []
        seen = set()
        for name, _ in sorted_colors:
            if name not in seen:
                unique_color_names.append(name)
                seen.add(name)

        colors_description = ", ".join(unique_color_names) if unique_color_names else "no specific colors"
        excluded_items = ""
        if temp >= 22:
            excluded_items = "coats, hoodies"
        elif temp <= 10:
            excluded_items = "short, tank tops" 
        # Create prompt
        prompt = (
            f"You are a fashion assistant. Based on the closet items below and the current weather, suggest a complete outfit.\n"
            f"Use 3 to 5 items from the closet, ideally covering each category (e.g., top, bottom, shoes, accessory).\n"
            f"Closet items: {closet_text}.\n"
            f"Weather: {weather_tag}, temperature: {temp}°C.\n"
            f"Prominent closet colors: {colors_description}.\n"
            f"Use color coordination and include at least one accent color (a color with low percentage in the closet).\n"
            f"Match the right colors with the right clothing categories.\n"
            f"Example: a black top, blue jeans, and white sneakers.\n"
        )

        if excluded_items:
            prompt += f"Exclude items like {excluded_items} because the weather is warm.\n"

        prompt += (
            "Only include items that are weather-appropriate and look good together.\n"
            "Format the response as a short sentence listing the outfit.\n"
            "Start with a short comment about the temperature, e.g., 'The weather is hot at 30°C, so you can wear...'\n"
            "Only use closet items available in the user's closet.\n"
            "Example (for warm weather): 'The weather is hot at 30°C, so you can wear a black T-shirt, black shorts, and sneakers.'\n"
            "Do not mention weather tags like 'all-weather'.\n"
            "Only use Prominent closet colors of a category for the category.'example: black joggers'.\n"
            "If the input is unrelated to fashion (e.g., math, sports, general knowledge), reply with: "
            "'Sorry, I can only help with outfit suggestions.'\n"
            "Suggest an outfit:"
        )

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You're a virtual stylist helping users pick outfits based on weather and closet items."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=180,
            temperature=0.6
        )

        idea = response["choices"][0]["message"]["content"].strip()
        return jsonify({
            "outfit_idea": idea,
            "temp": temp,
            "weather_tag": weather_tag,
            "city": city
        })

    except Exception as e:
        print("Error in generate_outfit_from_closet:", e)
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Internal server error"}), 500

def cartoonize_image(filepath):
    img = cv2.imread(filepath)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 5)
    edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C,
                                  cv2.THRESH_BINARY, 9, 9)
    color = cv2.bilateralFilter(img, 9, 300, 300)
    cartoon = cv2.bitwise_and(color, color, mask=edges)
    return cartoon

def extract_dominant_colors(filepath, k=3, show_visual=False):
    print(f"Extracting {k} dominant colors from {filepath}")
    
    # Load image
    img = cv2.imread(filepath, cv2.IMREAD_UNCHANGED)

    # Handle alpha (transparency)
    if img.shape[-1] == 4:
        img = cv2.cvtColor(img, cv2.COLOR_BGRA2BGR)
    
    # Handle grayscale
    if len(img.shape) == 2 or img.shape[-1] == 1:
        img = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)

    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img = cv2.resize(img, (64, 64))
    img_flat = img.reshape(-1, 3)

    # KMeans clustering
    kmeans = KMeans(n_clusters=k, n_init=10)
    labels = kmeans.fit_predict(img_flat)
    centers = kmeans.cluster_centers_.astype(int)

    # Count cluster sizes
    counts = Counter(labels)
    total = sum(counts.values())

    # Load color names
    with open("colors.json") as f:
        CSS3_NAMES_TO_HEX = json.load(f)

    # Helper: RGB to LAB
    def rgb_to_lab(rgb):
        rgb = np.array(rgb) / 255.0
        xyz = RGB_to_XYZ(rgb, 'sRGB')  # or 'ACEScg', 'Adobe RGB (1998)', etc.
        lab = XYZ_to_Lab(xyz)
        return lab

    # Find nearest CSS color name
    def closest_color(rgb):
        try:
            return webcolors.rgb_to_name(rgb, spec='css3')
        except ValueError:
            target_lab = rgb_to_lab(rgb)
            min_delta = float('inf')
            closest_name = "unknown"

            for name, hex_val in CSS3_NAMES_TO_HEX.items():
                css_rgb = tuple(int(hex_val.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
                css_lab = rgb_to_lab(css_rgb)
                delta = delta_E(target_lab, css_lab, method='CIE 2000')
                if delta < min_delta:
                    min_delta = delta
                    closest_name = name
            return closest_name

    # Prepare results
    results = []
    for idx, rgb in enumerate(centers):
        percent = round((counts[idx] / total) * 100, 2)
        name = closest_color(tuple(rgb))
        hex_value = webcolors.rgb_to_hex(tuple(rgb))
        results.append({
            "name": name,
            "rgb": tuple(rgb),
            "hex": hex_value,
            "percentage": percent
        })

    # Sort results
    results.sort(key=lambda x: -x["percentage"])

    # Optional bar chart
    if show_visual:
        import matplotlib.pyplot as plt
        plt.figure(figsize=(8, 2))
        for i, color in enumerate(results):
            plt.bar(i, 1, color=color["hex"])
            plt.text(i, 1.05, f"{color['name']} ({color['percentage']}%)", ha='center', fontsize=8)
        plt.axis('off')
        plt.tight_layout()
        plt.show()

    return results

@outfitback.route('/cartoonize',methods=['post'])
def cartoonize():
    os.makedirs("/tmp", exist_ok=True)
    # Add prints *before* the try block
    print("--- Request received ---")
    print(f"Method: {request.method}")
    print(f"Content-Type: {request.headers.get('Content-Type')}")
    print(f"Files in request.files: {list(request.files.keys())}") # See what keys are available
    print("Attempting to enter try block...")

    try:
        # 1. Get file from request
        # This line is where the error is likely originating from if request.files['image'] fails
        file = request.files['image']
        print("Successfully accessed request.files['image']") # This print will only run if the above line succeeds

        def resize_image(filepath, max_size=512):
            img = cv2.imread(filepath)
            height, width = img.shape[:2]

            # Scale while maintaining aspect ratio
            scale = max_size / max(height, width)
            new_dim = (int(width * scale), int(height * scale))
            
            resized_img = cv2.resize(img, new_dim)
            cv2.imwrite(filepath, resized_img)  # Overwrite the same file
        # The print below was in your code, but it's after the potential failure point
        # print("Received request to /cartoonize") # This might not be needed anymore with the others

        filename = secure_filename(file.filename)
        filepath = f"tmp/{filename}"
        print(f"Saving file to {filepath}")
        file.save(filepath)
        print(f"File saved: {filepath}")
        resize_image(filepath, max_size=512)

        # 2. Send to Replicate (example using Toonify)
        print("Sending image to Replicate...")
        #        segmentation_output = replicate.run(
        #            "naklecha/clothing-segmentation:501aa8488496fffc6bbee9544729dc28654649f2e3c80de0bf08fb9fe71898f8",
        #            input={"image": open(filepath, "rb")}
        #        )
        #        segmented_img_urls = [str(obj) for obj in segmentation_output]
        #        segmented_img_url = segmented_img_urls[0]
        #        response = requests.get(segmented_img_url)
        #        with open("segmented.png", "wb") as f:
        #           f.write(response.content)
        output = replicate.run(
            "catacolabs/cartoonify:f109015d60170dfb20460f17da8cb863155823c85ece1115e1e9e4ec7ef51d3b",
            input={"image": open(filepath, "rb"),
                   "prompt": "A cartoon-style version of the uploaded clothing item without changing the text on the clothing item",
                   "aspect_ratio": "16:9"}
        )
        print(f"Replicate output received (first 100 chars): {str(output)[:100]}")


        cartoon_Url = output[0] if isinstance(output, list) else output# Assuming output is the URL
        print(f"Cartoon URL: {cartoon_Url}")

        # Download cartoon image and upload to Firebase:
        print(f"Downloading cartoon image from {cartoon_Url}")
        r = requests.get(cartoon_Url, stream=True)
        if r.status_code != 200:
             print(f"Error downloading cartoon image: Status {r.status_code}")
             # You might want to return an error here instead of continuing
             # return jsonify({"error": f"Failed to download cartoon image from Replicate. Status code: {r.status_code}"}), 500


        temp_cartoon_path = "tmp/cartoon.jpg"
        with open(temp_cartoon_path, 'wb') as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Cartoon image downloaded to {temp_cartoon_path}")

        # 3. Upload to Firebase
        print("Uploading to Firebase Storage...")
        bucket = storage.bucket()
        cartoon_filename = f"cartoonized/{uuid.uuid4().hex}_{secure_filename(file.filename)}"
        blob = bucket.blob(cartoon_filename)

        blob.upload_from_filename(temp_cartoon_path)
        blob.make_public()
        print(f"Uploaded cartoon to {blob.public_url}")

        print("Extracting dominant colors from cartoon image...")
        dominant_colors = extract_dominant_colors(filepath)
        print(f"Extracted dominant colors: {dominant_colors}")
        for color in dominant_colors:
            color['rgb'] = tuple(int(c) for c in color['rgb'])
            color['percentage'] = float(color['percentage'])
        # 4. Clean up temp files
        print(f"Cleaning up temporary files: {filepath}, {temp_cartoon_path}")
        os.remove(filepath)
        os.remove(temp_cartoon_path)
        print("Temporary files cleaned.")
        db = firestore.client()
        user_id = request.form.get("userId")
        original_url = request.form.get("originalUrl")
        category = request.form.get("category")
        city = request.form.get("city", "London")
        lat = request.args.get("lat")
        lon = request.args.get("lon")
        if lat and lon:
            weather_data = get_weather_by_coords(lat, lon, api_key)
        else:
            weather_data = get_weather(city, api_key)
        temp = weather_data.get("temp") if weather_data else None
        weather_tag = infer_weather_tag_from_category(category)
        doc_ref = db.collection("closet").document()
        print("Firestore data to save:")
        print({
            "userId": user_id,
            "originalUrl": original_url,
            "category": category,
            "weather_Tag":weather_tag,
            "cartoonURL": blob.public_url,
            "dominantColors": dominant_colors,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        doc_ref.set({
            "userId": user_id,
            "originalUrl": original_url,
            "category": category,
            "weather_Tag":weather_tag,
            "cartoonURL": blob.public_url,
            "dominantColors": dominant_colors,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        # 5. Return public Firebase URL
        print("Returning success response.")
        return jsonify({"cartoonUrl": blob.public_url,
                        "weather_Tag": weather_tag,
                        "temp": temp,
                        "city": city})

    except Exception as e:
        print("--- An error occurred in the try block ---")
        print("Error type:", type(e).__name__)
        print("Error message:", e)
        # You can print the full traceback here for more detail
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"An internal server error occurred: {str(e)}"}), 500

# ... rest of your Flask app setup ...

if __name__ == '__main__':
    # Ensure the temp directory exists
    if not os.path.exists('tmp'):
        os.makedirs('tmp')
    outfitback.run(debug=True)