import hashlib
import openai
import os
import json
import requests
import dotenv
from pinecone import Pinecone, ServerlessSpec
dotenv.load_dotenv()
client =  openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
pc = Pinecone(api_key=os.environ.get("PINECONE_API_KEY"))
SAVE_CONFIDENCE_THRESHOLD = 0.8
user_text = "This is a test text for embedding."
intent = "test_intent"
confidence = 0.95
index = pc.Index("outfit-patterns")
def get_embedding(user_text):
    response = client.embeddings.create(
        input=user_text,
        model="text-embedding-3-small",
        dimensions=1536,
    )
    return response.data[0].embedding
def save_pattern(user_text, intent, confidence):
    if confidence < SAVE_CONFIDENCE_THRESHOLD:
        return
    try:
        embedding = get_embedding(user_text)
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return
    index.upsert(vectors=[{
        #"id": hashlib.sha256(user_text.encode("utf-8")).hexdigest(),
        "id": user_text,
        "values": embedding,
        "metadata": {
            "intent": intent,
            "confidence": confidence,
            "text": user_text,
        }
    }])


def find_pattern(user_text, threshold=0.85):
    try:
        embedding = get_embedding(user_text)
    except Exception as e:
        print(f"Error generating embedding: {e}")
        return None, None
    results = index.query(vector=embedding, top_k=1, include_metadata=True)

    if results["matches"] and results["matches"][0]["score"] >= threshold:
        match = results["matches"][0]
        return match["metadata"]["intent"], match["metadata"]["confidence"]

    return None, None


if __name__ == "__main__":
    save_pattern("heyyy,how are you?", "greeting", 0.95)
    intent, confidence = find_pattern("hiiii,how are you?")
    print(f"Intent: {intent}, Confidence: {confidence}")
    print(index.describe_index_stats())
