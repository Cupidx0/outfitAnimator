import outfitback as app_module
from outfitback import (
    outfitback,
    get_weather_tag,
    infer_weather_tag_from_category,
    blob_path_from_url,
)

client = outfitback.test_client()


def test_weather_tag_boundaries():
    assert get_weather_tag(None) == "unknown"
    assert get_weather_tag(9.9) == "cold"
    assert get_weather_tag(10) == "cool"
    assert get_weather_tag(18) == "warm"
    assert get_weather_tag(25) == "hot"


def test_category_tags_cover_frontend_categories():
    assert infer_weather_tag_from_category("coat") == "cold"
    assert infer_weather_tag_from_category("trouser") == "cool"
    assert infer_weather_tag_from_category("short") == "warm"
    assert infer_weather_tag_from_category(None) == "all-weather"


def test_blob_path_from_public_and_download_urls():
    assert blob_path_from_url("https://storage.googleapis.com/bucket/cartoonized/a_b.jpg") == "cartoonized/a_b.jpg"
    assert blob_path_from_url(
        "https://firebasestorage.googleapis.com/v0/b/bucket/o/users%2Fu1%2Ftop%2Fx.jpg?alt=media&token=t"
    ) == "users/u1/top/x.jpg"
    assert blob_path_from_url("https://example.com/x.jpg") is None
    assert blob_path_from_url(None) is None


def test_protected_routes_reject_missing_token():
    assert client.post("/generate_outfit_from_closet", json={"prompt": "beach party"}).status_code == 401
    assert client.post("/cartoonize").status_code == 401
    assert client.get("/closet").status_code == 401
    assert client.delete("/closet/abc").status_code == 401


def test_protected_routes_reject_bad_token(monkeypatch):
    def fail(_token):
        raise ValueError("bad token")
    monkeypatch.setattr(app_module.firebase_auth, "verify_id_token", fail)
    res = client.get("/closet", headers={"Authorization": "Bearer nope"})
    assert res.status_code == 401


def test_generate_requires_prompt(monkeypatch):
    monkeypatch.setattr(app_module.firebase_auth, "verify_id_token", lambda _t: {"uid": "u1"})
    res = client.post("/generate_outfit_from_closet", json={}, headers={"Authorization": "Bearer ok"})
    assert res.status_code == 400


def test_weather_route_handles_failed_lookup(monkeypatch):
    monkeypatch.setattr(app_module, "get_weather", lambda *a: None)
    assert client.get("/weather?city=London").status_code == 502
