import outfitback as app_module
from outfitback import (
    outfitback,
    get_weather_tag,
    infer_weather_tag_from_category,
    blob_path_from_url,
    parse_stylist_reply,
    covers_outfit,
)
import json
from types import SimpleNamespace

import pytest

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


CLOSET = [
    {"id": "a", "category": "top", "cartoonURL": "https://x/a.png"},
    {"id": "b", "category": "trouser", "cartoonURL": "https://x/b.png"},
    {"id": "c", "category": "cap", "cartoonURL": None},
]


def test_parse_stylist_reply_keeps_only_real_closet_items():
    raw = json.dumps({
        "title": "Easy Friday",
        "summary": "Light layers for a mild day.",
        "items": [{"id": 1, "why": "clean base"}, {"id": "2"}, {"id": 2}, {"id": 9}, {"id": 3}],
        "missing": [{"piece": "white sneakers"}, "none"],
        "extras": ["silver watch", ""],
    })
    outfit = parse_stylist_reply(raw, CLOSET)
    assert [i["id"] for i in outfit["items"]] == ["a", "b"]
    assert outfit["items"][0]["why"] == "clean base"
    assert outfit["missing"] == [{"piece": "white sneakers", "why": ""}]
    assert outfit["extras"] == ["silver watch"]
    assert outfit["off_topic"] is False


def test_parse_stylist_reply_rejects_non_json():
    with pytest.raises(ValueError):
        parse_stylist_reply("Wear a hat. ITEMS: 1", CLOSET)


def test_covers_outfit_needs_upper_and_lower():
    assert covers_outfit([{"category": "top"}, {"category": "short"}])
    assert not covers_outfit([{"category": "top"}, {"category": "cap"}])
    assert not covers_outfit([])


class FakeDoc:
    def __init__(self, doc_id, data):
        self.id, self._data = doc_id, data

    def to_dict(self):
        return self._data


def fake_generate(monkeypatch, reply):
    docs = [
        FakeDoc("a", {"category": "top", "cartoonURL": "https://x/a.png", "dominantColors": [{"name": "navy", "percentage": 70}]}),
        FakeDoc("b", {"category": "trouser", "cartoonURL": "https://x/b.png"}),
    ]
    query = SimpleNamespace(stream=lambda: docs)
    db = SimpleNamespace(collection=lambda _n: SimpleNamespace(where=lambda *a: query))
    sent = {}

    def create(**kwargs):
        sent.update(kwargs)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=json.dumps(reply)))])

    drawn = []
    monkeypatch.setattr(app_module.firebase_auth, "verify_id_token", lambda _t: {"uid": "u1"})
    monkeypatch.setattr(app_module, "get_db", lambda: db)
    monkeypatch.setattr(app_module, "get_weather", lambda *a: {"city": "Leeds", "temp": 8.0, "description": "light rain"})
    monkeypatch.setattr(app_module, "get_openai", lambda: SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create))))
    monkeypatch.setattr(app_module, "fetch_reference_images", lambda items: [])
    monkeypatch.setattr(app_module, "generate_image", lambda desc, refs, uid: drawn.append(desc) or "https://x/look.png")
    res = client.post("/generate_outfit_from_closet", json={"prompt": "coffee with friends"}, headers={"Authorization": "Bearer ok"})
    return res, sent, drawn


def test_generate_uses_closet_without_drawing_when_it_covers_the_look(monkeypatch):
    res, sent, drawn = fake_generate(monkeypatch, {
        "title": "Rainy coffee run", "summary": "Navy keeps it calm.",
        "items": [{"id": 1}, {"id": 2}], "missing": [], "extras": ["white sneakers"],
    })
    body = res.get_json()
    assert res.status_code == 200
    assert [i["id"] for i in body["closet_items"]] == ["a", "b"]
    assert body["image_url"] is None and drawn == []
    assert body["city"] == "Leeds"
    # The model sees the request, the weather and each item's colours.
    user_msg = sent["messages"][1]["content"]
    assert "coffee with friends" in user_msg and "light rain" in user_msg and "navy (70%)" in user_msg
    assert sent["response_format"] == {"type": "json_object"}


def test_generate_draws_when_a_piece_is_missing(monkeypatch):
    res, _, drawn = fake_generate(monkeypatch, {
        "summary": "Add a coat.", "items": [{"id": 1}, {"id": 2}],
        "missing": [{"piece": "camel wool coat", "why": "it is 8°C"}],
        "image_prompt": "navy tee, grey trousers, camel wool coat",
    })
    assert res.get_json()["image_url"] == "https://x/look.png"
    assert drawn == ["navy tee, grey trousers, camel wool coat"]


def test_generate_off_topic(monkeypatch):
    res, _, drawn = fake_generate(monkeypatch, {"off_topic": True, "items": [{"id": 1}]})
    body = res.get_json()
    assert body["outfit_idea"].startswith("Sorry") and body["closet_items"] == [] and drawn == []
