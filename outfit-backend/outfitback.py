from flask import Flask, request,jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import replicate
import firebase_admin
from firebase_admin import credentials, storage,firestore
import uuid
import os
import requests
#
service_account_key_path =  "outfitgenerator-d60a5-67f7d22b29c4.json"
if not os.path.exists(service_account_key_path):
    print(f"Error: Service account key file not found at {service_account_key_path}")
    # Handle error or exit
else:
    cred = credentials.Certificate(service_account_key_path)
    bucket_name = 'outfitgenerator-d60a5.firebasestorage.app' # <-- Make sure this is .com here!

    # *** Add this line to print the value being used ***
    print(f"Initializing Firebase Admin with storageBucket: {bucket_name}")
    # *****************************************************

    firebase_admin.initialize_app(cred, {
        'storageBucket': bucket_name # Use the variable
    })
    print("Firebase Admin SDK initialized successfully!")
db = firestore.client()
print("Firestore client obtained!")
outfitback = Flask(__name__)
CORS(outfitback)
#replicate Ai
os.environ["REPLICATE_API_TOKEN"] = "***REMOVED***"
#model = replicate.models.get("catacolabs/cartoonify")
#version = model.versions.get("f109015d60170dfb20460f17da8cb863155823c85ece1115e1e9e4ec7ef51d3b")
#prompt = "A cartoon-style version of the uploaded clothing item."
@outfitback.route('/')
def hello():
    return 'Backend is running now'
@outfitback.route('/cartoonize',methods=['post'])
def cartoonize():
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

        # The print below was in your code, but it's after the potential failure point
        # print("Received request to /cartoonize") # This might not be needed anymore with the others

        filename = secure_filename(file.filename)
        filepath = f"temp/{filename}"
        print(f"Saving file to {filepath}")
        file.save(filepath)
        print(f"File saved: {filepath}")

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


        temp_cartoon_path = "temp/cartoon.jpg"
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

        # 4. Clean up temp files
        print(f"Cleaning up temporary files: {filepath}, {temp_cartoon_path}")
        os.remove(filepath)
        os.remove(temp_cartoon_path)
        print("Temporary files cleaned.")
        db = firestore.client()
        user_id = request.form.get("userId")
        original_url = request.form.get("originalUrl")
        category = request.form.get("category")
        doc_ref = db.collection("closet").document()
        print("Firestore data to save:")
        print({
            "userId": user_id,
            "originalUrl": original_url,
            "category": category,
            "cartoonURL": blob.public_url,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        doc_ref.set({
            "userId": user_id,
            "originalUrl": original_url,
            "category": category,
            "cartoonURL": blob.public_url,
            "timestamp": firestore.SERVER_TIMESTAMP
        })
        # 5. Return public Firebase URL
        print("Returning success response.")
        return jsonify({"cartoonUrl": blob.public_url})

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
    if not os.path.exists('temp'):
        os.makedirs('temp')
    outfitback.run(debug=True)
    #CORS(app, origins=["https://yourfrontenddomain.com"])