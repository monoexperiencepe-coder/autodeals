"""
NeoAuto full-site scraper (two stages).

Stage 1 — Listing crawl:
  Crawls each major NeoAuto listing tab separately (Todos, Seminuevo, Usado, Nuevo 0km), each with
  its own pagination and resume state. Extracts slugs from the RSC payload (`\"slug\":\"auto/...\"`)
  for any listing path (seminuevo, nuevo, usado, etc.). Global dedupe of slugs; each slug stores
  `listingCategory` (upgraded to the most specific tab that listed it: nuevo_0km > usado > seminuevo > todos).

Stage 2 — Detail fetch:
  For each slug, GET detail HTML, parse USD price (+ km, title) from JSON-LD / meta, and structured
  attributes from schema.org Product.additionalProperty when present (combustible, tracción, etc.).
  Each record includes `listingCategory` from stage 1. Skip slugs already present in raw-deals.json
  (by canonical link). Append successes incrementally.

Outputs (same directory as this script):
  - all-slugs.json     — entries [{slug, listingCategory}] + per-category crawl progress for resume
  - raw-deals.json     — parsed records (same shape as deals.json), incremental
  - deals.json         — single unified list, deduped globally by canonical `link` (merged category
    keeps the more specific tab when duplicates exist)

Resume: Stage 1 continues each unfinished category from saved `next_page`. Stage 2 skips links
already in raw-deals.json with a successful record (has `price`).
"""

from __future__ import annotations

import argparse
import json
import os
import re
import signal
import sys
import tempfile
import time
import unicodedata
from typing import Any
from urllib.parse import urljoin

import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

BASE_URL = "https://neoauto.com"

# NeoAuto tabs → list URL paths (verified 2026).
LISTING_CATEGORIES: list[dict[str, str]] = [
    {"id": "todos", "list_path": "/venta-de-autos"},
    {"id": "seminuevo", "list_path": "/venta-de-autos-seminuevos"},
    {"id": "usado", "list_path": "/venta-de-autos-usados"},
    {"id": "nuevo_0km", "list_path": "/venta-de-autos-nuevos"},
]

LISTING_CATEGORY_PRIORITY: dict[str, int] = {
    "nuevo_0km": 4,
    "usado": 3,
    "seminuevo": 2,
    "todos": 1,
}

ALL_SLUGS_PATH = os.path.join(SCRIPT_DIR, "all-slugs.json")
RAW_DEALS_PATH = os.path.join(SCRIPT_DIR, "raw-deals.json")
DEALS_JSON_PATH = os.path.join(SCRIPT_DIR, "deals.json")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-PE,es;q=0.9,en;q=0.8",
}

REQUEST_DELAY_S = 0.25
LIST_PAGE_DELAY_S = 0.15

DETAIL_FETCH_MAX_ATTEMPTS = 3
DETAIL_RETRY_BACKOFF_BASE_S = 0.75
DETAIL_REQUEST_TIMEOUT_S = 35
DETAIL_PROGRESS_EVERY = 15

# Incremental disk writes (0 = only on interrupt / stage end for raw).
INCREMENTAL_RAW_SAVE_EVERY = 10
INCREMENTAL_DEALS_SAVE_EVERY = 25

# Pagination: stop after this many consecutive listing pages with zero **new** slugs (after global dedupe).
LISTING_NO_NEW_PAGE_STREAK_STOP = 3
# Absolute safety ceiling (bug / site change); not the primary stop condition.
MAX_LISTING_PAGES_SAFETY = 5000

SESSION = requests.Session()
SESSION.headers.update(HEADERS)

_interrupt_ctx: dict[str, Any] = {"raw_cars": None, "paths": None}


def parse_km(km_text: str | None) -> int | None:
    if not km_text:
        return None
    cleaned = re.sub(r"[^\d]", "", km_text)
    return int(cleaned) if cleaned else None


def estimate_market_price(price: int | None, year: int | None, km: int | None) -> int | None:
    if not price or not year:
        return None

    current_year = 2026
    age = max(0, current_year - year)

    market_price = price * (1 + 0.03 * age)

    if km and km > 20000:
        market_price += min(5000, (km - 20000) * 0.05)

    return round(market_price)


def extract_listing_slugs(listing_html: str) -> tuple[list[str], int]:
    """Any NeoAuto vehicle slug: auto/{seminuevo|nuevo|usado|...}/...-ID."""
    found = re.findall(r'\\"slug\\":\\"(auto/[^\\]+)\\"', listing_html)
    raw_regex_hits = len(found)
    seen: set[str] = set()
    ordered: list[str] = []
    for raw in found:
        slug = raw.strip()
        parts = slug.rstrip("/").split("/")
        if len(parts) < 3 or parts[0] != "auto":
            continue
        tail = parts[-1]
        if not re.search(r"-\d{6,}$", tail):
            continue
        if slug in seen:
            continue
        seen.add(slug)
        ordered.append(slug)
    return ordered, raw_regex_hits


def prefer_listing_category(current: str | None, candidate: str | None) -> str:
    """Keep the more specific NeoAuto tab when the same slug appears under several."""
    ca = current or "todos"
    cb = candidate or "todos"
    pa = LISTING_CATEGORY_PRIORITY.get(ca, 0)
    pb = LISTING_CATEGORY_PRIORITY.get(cb, 0)
    return cb if pb > pa else ca


def listing_url_for_page(list_path: str, page: int) -> str:
    base = f"{BASE_URL}{list_path}"
    if page <= 1:
        return base
    return f"{base}?page={page}"


def slug_to_canonical_link(slug: str) -> str:
    return urljoin(BASE_URL + "/", slug)


def year_from_slug(slug: str) -> int | None:
    tail = slug.rstrip("/").split("/")[-1]
    m = re.search(r"-((?:19|20)\d{2})-(\d{6,})$", tail)
    return int(m.group(1)) if m else None


def parse_detail_usd_price(html: str) -> int | None:
    m = re.search(r'"priceCurrency"\s*:\s*"USD"\s*,\s*"price"\s*:\s*(\d+)', html)
    if m:
        return int(m.group(1))
    m2 = re.search(r'"@type"\s*:\s*"Offer"[\s\S]{0,400}?"price"\s*:\s*(\d+)', html)
    return int(m2.group(1)) if m2 else None


def parse_detail_km(html: str) -> int | None:
    m = re.search(r'"name"\s*:\s*"Kilometraje"\s*,\s*"value"\s*:\s*"([\d\.,]+)\s*km"', html, re.I)
    if not m:
        return None
    return parse_km(m.group(1))


def parse_detail_title(html: str) -> str | None:
    m = re.search(r'<meta\s+property="og:title"\s+content="([^"]+)"', html, re.I)
    if not m:
        return None
    raw = m.group(1).split("|")[0].strip()
    raw = re.sub(r"\s+Seminuevo\b.*$", "", raw, flags=re.I).strip()
    raw = raw.rstrip(" ,")
    return raw or None


def split_brand_model(title: str, year: int | None) -> tuple[str | None, str | None]:
    parts = title.split()
    if year is not None:
        ys = str(year)
        parts = [p for p in parts if p != ys]
    if len(parts) >= 2:
        return parts[0], parts[1]
    if len(parts) == 1:
        return parts[0], None
    return None, None


def _strip_accents(s: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def _norm_key(s: str) -> str:
    return _strip_accents(s).lower().strip()


def _as_text(val: Any) -> str | None:
    if val is None:
        return None
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, (int, float)):
        return str(int(val)) if isinstance(val, float) and val == int(val) else str(val)
    t = str(val).strip()
    return t or None


def extract_json_ld_graph_nodes(html: str) -> list[dict[str, Any]]:
    """Collect nodes from application/ld+json (NeoAuto uses @graph inside one block)."""
    blocks = re.findall(
        r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>([\s\S]*?)</script>',
        html,
        re.I,
    )
    out: list[dict[str, Any]] = []
    for raw in blocks:
        raw = raw.strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict) and "@graph" in data:
            g = data["@graph"]
            if isinstance(g, list):
                for n in g:
                    if isinstance(n, dict):
                        out.append(n)
        elif isinstance(data, list):
            for n in data:
                if isinstance(n, dict):
                    out.append(n)
        elif isinstance(data, dict):
            out.append(data)
    return out


def _schema_type(node: dict[str, Any]) -> str | list[str] | None:
    return node.get("@type")


def _type_matches(t: Any, name: str) -> bool:
    if isinstance(t, list):
        return name in t
    return t == name


def find_schema_org_product(graph: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Prefer Product with offers (listing page pattern on NeoAuto)."""
    with_offers: list[dict[str, Any]] = []
    products: list[dict[str, Any]] = []
    for node in graph:
        t = _schema_type(node)
        if not _type_matches(t, "Product"):
            continue
        products.append(node)
        if isinstance(node.get("offers"), dict):
            with_offers.append(node)
    return with_offers[0] if with_offers else (products[0] if products else None)


def index_additional_properties(product: dict[str, Any]) -> dict[str, str]:
    """Map normalized Spanish property names → string values."""
    idx: dict[str, str] = {}
    for pv in product.get("additionalProperty") or []:
        if not isinstance(pv, dict):
            continue
        name = _as_text(pv.get("name"))
        val = _as_text(pv.get("value"))
        if not name or val is None:
            continue
        idx[_norm_key(name)] = val
    return idx


def _parse_int_loose(s: str | None) -> int | None:
    if not s:
        return None
    digits = re.sub(r"[^\d]", "", s)
    return int(digits) if digits else None


def parse_engine_field(motor_raw: str | None) -> tuple[int | None, int | None, str | None]:
    """
    NeoAuto example: "1600cc 4 Cilindros" → displacement cc, cylinder count, short class hint.
    """
    if not motor_raw:
        return None, None, None
    t = motor_raw.strip()
    cc: int | None = None
    m_cc = re.search(r"(\d{3,4})\s*cc\b", t, re.I)
    if m_cc:
        cc = int(m_cc.group(1))
    cyl: int | None = None
    m_cyl = re.search(r"(\d)\s*cil", t, re.I)
    if m_cyl:
        cyl = int(m_cyl.group(1))
    eng_class: str | None = None
    if cyl == 4:
        eng_class = "inline_4"
    elif cyl == 6:
        eng_class = "v6"
    elif cyl == 8:
        eng_class = "v8"
    elif cyl == 3:
        eng_class = "inline_3"
    return cc, cyl, eng_class


def normalize_fuel_type(combustible: str | None) -> str | None:
    if not combustible:
        return None
    x = _norm_key(combustible)
    if re.search(r"enchuf|plug|phev", x):
        return "plug_in_hybrid"
    if "hibrido" in x or "hybrid" in x:
        return "hybrid"
    if "electrico" in x or x == "ev":
        return "electric"
    if "diesel" in x or "diésel" in combustible.lower():
        return "diesel"
    if "gasolina" in x or "gasoline" in x:
        return "gasoline"
    if "gnv" in x or "cng" in x:
        return "cng"
    if "glp" in x or "gpl" in x:
        return "lpg"
    if "flex" in x or "bicombustible" in x or "dual" in x:
        return "flex"
    return "other"


def normalize_transmission(trans_raw: str | None) -> str | None:
    if not trans_raw:
        return None
    x = _norm_key(trans_raw)
    if "cvt" in x:
        return "cvt"
    if "doble embrague" in x or "dct" in x or "edc" in x:
        return "automated_manual"
    if "mecan" in x or "manual" in x:
        return "manual"
    if "autom" in x or "automatica" in x or "automatico" in x:
        return "automatic"
    return "other"


def normalize_body_type(carroceria: str | None) -> str | None:
    if not carroceria:
        return None
    x = _norm_key(carroceria)
    if "suv" in x:
        return "suv"
    if "pick" in x or "pick-up" in x:
        return "pickup"
    if "sedan" in x or "sedán" in carroceria.lower():
        return "sedan"
    if "hatch" in x:
        return "hatchback"
    if "coupe" in x or "coupé" in carroceria.lower():
        return "coupe"
    if "wagon" in x or "familiar" in x or "station" in x:
        return "wagon"
    if "minivan" in x:
        return "minivan"
    if re.search(r"\bvan\b", x):
        return "van"
    if "convertible" in x or "cabrio" in x:
        return "convertible"
    return "other"


def normalize_drivetrain(traccion_raw: str | None) -> str | None:
    if not traccion_raw:
        return None
    compact = re.sub(r"\s+", "", traccion_raw.lower())
    x = _norm_key(traccion_raw)
    if "4x2" in compact:
        return "4x2"
    if "4x4" in compact or "4wd" in compact:
        return "4x4"
    if "awd" in compact:
        return "awd"
    if "delanter" in x or "fwd" in compact or "front" in x:
        return "fwd"
    if "trasera" in x or "rwd" in compact or "rear" in x:
        return "rwd"
    if "integral" in x or "total" in x:
        return "awd"
    return None


def traction_keywords_from_raw(traccion_raw: str | None) -> list[str] | None:
    if not traccion_raw:
        return None
    dt = normalize_drivetrain(traccion_raw)
    if dt:
        return [dt]
    tokens = re.split(r"[/,\s]+", _norm_key(traccion_raw))
    seen: list[str] = []
    for tok in tokens:
        if not tok or len(tok) < 2:
            continue
        if tok not in seen:
            seen.append(tok)
    return seen or None


def fuel_flags(
    fuel_norm: str | None, combustible_raw: str | None
) -> tuple[bool | None, bool | None, bool | None]:
    """
    isHybrid, isElectric, isDiesel — True/False only when structured fuel text supports it; else None.
    """
    if not combustible_raw and not fuel_norm:
        return None, None, None
    fn = fuel_norm or normalize_fuel_type(combustible_raw)
    if fn is None:
        return None, None, None
    is_e = fn == "electric"
    is_h = fn in ("hybrid", "plug_in_hybrid")
    is_d = fn == "diesel"
    # Known non-diesel liquid fuels → explicit False for diesel when we have a clear gasoline/other gas
    if fn == "gasoline":
        return False, False, False
    if fn == "diesel":
        return False, False, True
    if fn == "electric":
        return False, True, False
    if fn in ("hybrid", "plug_in_hybrid"):
        return True, False, False
    if fn in ("cng", "lpg", "flex", "other"):
        return False, False, False
    return None, None, None


def extract_vehicle_attributes_from_html(html: str) -> tuple[dict[str, Any], bool]:
    """
    Pull normalized fields from NeoAuto schema.org Product JSON-LD.
    Any missing signal → null (no guessing from title).
    Second return value: True if Product had additionalProperty entries (structured specs present).
    """
    nulls: dict[str, Any] = {
        "fuelType": None,
        "transmission": None,
        "drivetrain": None,
        "trim": None,
        "engineDisplacementCc": None,
        "engineCylinders": None,
        "engineClass": None,
        "engineDescription": None,
        "bodyType": None,
        "isHybrid": None,
        "isElectric": None,
        "isDiesel": None,
        "tractionKeywords": None,
        "cabType": None,
        "doors": None,
        "seats": None,
    }

    graph = extract_json_ld_graph_nodes(html)
    product = find_schema_org_product(graph)
    if not product:
        return nulls, False

    props = index_additional_properties(product)
    if not props:
        return nulls, False

    combustible = props.get("combustible")
    trans_raw = props.get("transmision")
    traccion_raw = props.get("traccion")
    motor_raw = props.get("motor")
    carroceria = props.get("tipo de carroceria")
    trim = props.get("configuracion del vehiculo")

    fuel_norm = normalize_fuel_type(combustible)
    ih, ie, idsl = fuel_flags(fuel_norm, combustible)

    cc, cyl, eng_cls = parse_engine_field(motor_raw)

    dt = normalize_drivetrain(traccion_raw)
    tk = traction_keywords_from_raw(traccion_raw)

    cab = None
    for k, v in props.items():
        if "cabina" in k:
            cab = _as_text(v)
            break

    doors = _parse_int_loose(props.get("puertas"))
    seats = None
    for key in ("asientos", "numero de asientos", "pasajeros", "capacidad de pasajeros"):
        if key in props:
            seats = _parse_int_loose(props[key])
            break

    out = dict(nulls)
    out["fuelType"] = fuel_norm
    out["transmission"] = normalize_transmission(trans_raw)
    out["drivetrain"] = dt
    out["trim"] = trim
    out["engineDisplacementCc"] = cc
    out["engineCylinders"] = cyl
    out["engineClass"] = eng_cls
    out["engineDescription"] = motor_raw
    out["bodyType"] = normalize_body_type(carroceria)
    out["isHybrid"] = ih
    out["isElectric"] = ie
    out["isDiesel"] = idsl
    out["tractionKeywords"] = tk
    out["cabType"] = cab
    out["doors"] = doors
    out["seats"] = seats
    return out, True


def fetch_text(url: str, *, timeout: float = 25) -> str:
    r = SESSION.get(url, timeout=timeout)
    r.raise_for_status()
    return r.text


def fetch_detail_html(url: str) -> str | None:
    last_err: BaseException | None = None
    for attempt in range(DETAIL_FETCH_MAX_ATTEMPTS):
        try:
            return fetch_text(url, timeout=DETAIL_REQUEST_TIMEOUT_S)
        except requests.RequestException as e:
            last_err = e
            if attempt < DETAIL_FETCH_MAX_ATTEMPTS - 1:
                time.sleep(DETAIL_RETRY_BACKOFF_BASE_S * (attempt + 1))
    if last_err is not None:
        print(
            f"aviso omitido tras {DETAIL_FETCH_MAX_ATTEMPTS} intentos ({url}): {last_err}"
        )
    return None


def dedupe_cars_by_link(cars: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    """First occurrence wins order; same link merges fields and keeps the more specific `listingCategory`."""
    order: list[str] = []
    best: dict[str, dict[str, Any]] = {}
    for car in cars:
        link = car.get("link")
        if not link:
            continue
        cat = str(car.get("listingCategory") or "todos")
        if link not in best:
            row = dict(car)
            row["listingCategory"] = cat
            best[link] = row
            order.append(link)
        else:
            prev = best[link]
            merged_cat = prefer_listing_category(
                str(prev.get("listingCategory") or "todos"), cat
            )
            best[link] = {**prev, **car, "listingCategory": merged_cat}
    unique = [best[lnk] for lnk in order]
    return unique, len(cars) - len(unique)


def atomic_write_json(path: str, data: Any) -> None:
    abs_path = os.path.abspath(path)
    dir_name = os.path.dirname(abs_path) or "."
    if dir_name:
        os.makedirs(dir_name, exist_ok=True)
    fd, tmp_path = tempfile.mkstemp(suffix=".tmp", prefix="neoauto_", dir=dir_name, text=True)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, abs_path)
    except BaseException:
        try:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
        except OSError:
            pass
        raise


def save_deals_json_atomic(cars: list[dict[str, Any]], path: str) -> tuple[int, int]:
    unique, dropped = dedupe_cars_by_link(cars)
    atomic_write_json(path, unique)
    return len(unique), dropped


# --- Persistence: all-slugs.json ---


def default_category_crawl() -> dict[str, Any]:
    return {
        "next_page": 1,
        "consecutive_pages_no_new_slugs": 0,
        "listing_pages_fetched_total": 0,
        "cumulative_raw_regex_hits": 0,
        "finished": False,
    }


def default_slug_doc_v2() -> dict[str, Any]:
    return {
        "version": 2,
        "entries": [],
        "crawl": {
            "categories": {c["id"]: default_category_crawl() for c in LISTING_CATEGORIES},
        },
    }


def _migrate_slug_doc_v1_to_v2(doc: dict[str, Any]) -> dict[str, Any]:
    """Legacy: single list_path + slugs[]."""
    raw_slugs = doc.get("slugs") if isinstance(doc.get("slugs"), list) else []
    entries: list[dict[str, str]] = [
        {"slug": s, "listingCategory": "todos"} for s in raw_slugs if isinstance(s, str)
    ]
    old = doc.get("crawl") if isinstance(doc.get("crawl"), dict) else {}
    cats: dict[str, Any] = {c["id"]: default_category_crawl() for c in LISTING_CATEGORIES}
    cats["todos"] = {
        "next_page": int(old.get("next_page") or 1),
        "consecutive_pages_no_new_slugs": int(old.get("consecutive_pages_no_new_slugs") or 0),
        "listing_pages_fetched_total": int(old.get("listing_pages_fetched_total") or 0),
        "cumulative_raw_regex_hits": int(old.get("cumulative_raw_regex_hits") or 0),
        "finished": bool(old.get("finished", False)),
    }
    return {"version": 2, "entries": entries, "crawl": {"categories": cats}}


def load_slug_doc() -> dict[str, Any]:
    if not os.path.isfile(ALL_SLUGS_PATH):
        return json.loads(json.dumps(default_slug_doc_v2()))
    try:
        with open(ALL_SLUGS_PATH, encoding="utf-8") as f:
            doc = json.load(f)
    except (OSError, json.JSONDecodeError):
        return json.loads(json.dumps(default_slug_doc_v2()))
    if not isinstance(doc, dict):
        return json.loads(json.dumps(default_slug_doc_v2()))

    ver = int(doc.get("version") or 1)
    if ver < 2:
        doc = _migrate_slug_doc_v1_to_v2(doc)

    doc.setdefault("version", 2)
    doc.setdefault("entries", [])
    doc.setdefault("crawl", {})
    cr = doc["crawl"]
    cr.setdefault("categories", {})
    if not isinstance(cr["categories"], dict):
        cr["categories"] = {}
    for c in LISTING_CATEGORIES:
        cid = c["id"]
        if cid not in cr["categories"] or not isinstance(cr["categories"][cid], dict):
            cr["categories"][cid] = default_category_crawl()
        st = cr["categories"][cid]
        st.setdefault("next_page", 1)
        st.setdefault("consecutive_pages_no_new_slugs", 0)
        st.setdefault("listing_pages_fetched_total", 0)
        st.setdefault("cumulative_raw_regex_hits", 0)
        st.setdefault("finished", False)

    if not isinstance(doc["entries"], list):
        doc["entries"] = []

    # Legacy file that already had version 2 but still stores `slugs` only.
    if not doc["entries"] and isinstance(doc.get("slugs"), list):
        doc["entries"] = [
            {"slug": s, "listingCategory": "todos"}
            for s in doc["slugs"]
            if isinstance(s, str)
        ]

    return doc


def save_slug_doc(doc: dict[str, Any]) -> None:
    payload = json.loads(json.dumps(doc))
    payload.pop("slugs", None)
    atomic_write_json(ALL_SLUGS_PATH, payload)


# --- Persistence: raw-deals.json ---

def load_raw_deals() -> list[dict[str, Any]]:
    if not os.path.isfile(RAW_DEALS_PATH):
        return []
    try:
        with open(RAW_DEALS_PATH, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, list) else []
    except (OSError, json.JSONDecodeError):
        return []


def save_raw_deals(cars: list[dict[str, Any]]) -> None:
    atomic_write_json(RAW_DEALS_PATH, cars)


def links_successfully_parsed(raw: list[dict[str, Any]]) -> set[str]:
    """Links that already have a usable USD price (skip re-fetch)."""
    out: set[str] = set()
    for car in raw:
        link = car.get("link")
        if link and car.get("price") is not None:
            out.add(link)
    return out


def build_car(
    slug: str, html: str, listing_category: str
) -> tuple[dict[str, Any] | None, bool]:
    link = slug_to_canonical_link(slug)
    price = parse_detail_usd_price(html)
    if price is None:
        return None, False

    year = year_from_slug(slug)
    km_val = parse_detail_km(html)
    title = parse_detail_title(html) or slug.split("/")[-1].replace("-", " ").title()
    brand, model = split_brand_model(title, year)
    attrs, had_schema_props = extract_vehicle_attributes_from_html(html)

    car: dict[str, Any] = {
        "title": title or "Sin título",
        "brand": brand,
        "model": model,
        "price": price,
        "currency": "USD",
        "marketPrice": estimate_market_price(price, year, km_val),
        "year": year,
        "km": km_val,
        "link": link,
        "source": "NeoAuto",
        "listingCategory": listing_category,
    }
    car.update(attrs)
    return car, had_schema_props


def _on_sigterm(signum: int, frame: Any) -> None:
    print(f"\n[save] Señal {signum} recibida — guardando y saliendo…", file=sys.stderr)
    raise SystemExit(128 + signum)


def run_stage1_collect_slugs(*, fresh: bool) -> dict[str, Any]:
    """
    Collect unique listing slugs across all NeoAuto category tabs. Persists after each page.
    """
    doc = load_slug_doc()
    if fresh:
        doc = json.loads(json.dumps(default_slug_doc_v2()))
        print("[stage1] --fresh: reiniciando recolección (todas las categorías, página 1).")

    entries: list[dict[str, str]] = []
    for e in doc.get("entries") or []:
        if isinstance(e, dict) and isinstance(e.get("slug"), str):
            lc = e.get("listingCategory") or "todos"
            entries.append({"slug": e["slug"], "listingCategory": str(lc)})
        elif isinstance(e, str):
            entries.append({"slug": e, "listingCategory": "todos"})

    slug_to_cat: dict[str, str] = {e["slug"]: e["listingCategory"] for e in entries}
    crawl = doc["crawl"]
    cats: dict[str, Any] = crawl["categories"]

    all_finished = not fresh and all(
        bool(cats.get(c["id"], {}).get("finished")) for c in LISTING_CATEGORIES
    )
    if all_finished:
        print(
            f"[stage1] Crawl de listados terminado para todas las categorías — "
            f"{len(entries)} slugs en {ALL_SLUGS_PATH}. Usa --fresh para volver a rastrear."
        )
        return doc

    print(
        "[debug] Stage 1: NeoAuto por categoría (?page=N). Parada por categoría: "
        f"{LISTING_NO_NEW_PAGE_STREAK_STOP} páginas seguidas sin slugs nuevos válidos "
        f"(tope seguridad {MAX_LISTING_PAGES_SAFETY} por categoría)."
    )
    print(f"[debug] Entradas previas: {len(entries)} slugs únicos con categoría asignada.")

    for cat in LISTING_CATEGORIES:
        cid = cat["id"]
        list_path = cat["list_path"]
        cstate = cats[cid]
        if cstate.get("finished") and not fresh:
            print(f"[stage1] Categoría «{cid}»: ya terminada, se omite.")
            continue

        page = int(cstate.get("next_page") or 1)
        streak = int(cstate.get("consecutive_pages_no_new_slugs") or 0)
        total_pages_run = int(cstate.get("listing_pages_fetched_total") or 0)
        cumulative_raw = int(cstate.get("cumulative_raw_regex_hits") or 0)
        stopped_reason = ""

        print(f"[stage1] --- Categoría «{cid}» ({list_path}) — siguiente página: {page}")

        while True:
            if page > MAX_LISTING_PAGES_SAFETY:
                stopped_reason = f"tope seguridad MAX_LISTING_PAGES_SAFETY={MAX_LISTING_PAGES_SAFETY}"
                cstate["finished"] = True
                cstate["next_page"] = page
                cstate["consecutive_pages_no_new_slugs"] = streak
                cstate["listing_pages_fetched_total"] = total_pages_run
                cstate["cumulative_raw_regex_hits"] = cumulative_raw
                doc["entries"] = entries
                save_slug_doc(doc)
                break

            url = listing_url_for_page(list_path, page)
            html = fetch_text(url)
            slugs_on_page, raw_hits = extract_listing_slugs(html)
            cumulative_raw += raw_hits
            total_pages_run += 1

            new_on_page = 0
            upgraded = 0
            for s in slugs_on_page:
                if s not in slug_to_cat:
                    slug_to_cat[s] = cid
                    entries.append({"slug": s, "listingCategory": cid})
                    new_on_page += 1
                else:
                    old_c = slug_to_cat[s]
                    new_c = prefer_listing_category(old_c, cid)
                    if new_c != old_c:
                        slug_to_cat[s] = new_c
                        upgraded += 1
                        for ent in entries:
                            if ent["slug"] == s:
                                ent["listingCategory"] = new_c
                                break

            if new_on_page == 0 and upgraded == 0:
                streak += 1
            else:
                streak = 0

            print(
                f"[stage1] [{cid}] pág={page}: raw_hits={raw_hits}, "
                f"en_página={len(slugs_on_page)}, nuevos={new_on_page}, "
                f"cat_upgrade={upgraded}, total_slugs={len(entries)}, racha={streak}"
            )

            cstate["next_page"] = page + 1
            cstate["consecutive_pages_no_new_slugs"] = streak
            cstate["listing_pages_fetched_total"] = total_pages_run
            cstate["cumulative_raw_regex_hits"] = cumulative_raw
            cstate["finished"] = False
            doc["entries"] = entries
            save_slug_doc(doc)

            if streak >= LISTING_NO_NEW_PAGE_STREAK_STOP:
                stopped_reason = f"racha {LISTING_NO_NEW_PAGE_STREAK_STOP} sin slugs nuevos"
                cstate["finished"] = True
                save_slug_doc(doc)
                break

            page += 1
            time.sleep(LIST_PAGE_DELAY_S)

        print(f"[debug] Categoría «{cid}» fin: {stopped_reason or 'OK'} · páginas={total_pages_run}")

    print(f"[debug] Slugs únicos finales: {len(entries)} → {ALL_SLUGS_PATH}")
    return doc


def run_stage2_fetch_details(*, fresh_raw: bool) -> None:
    doc = load_slug_doc()
    entries: list[dict[str, str]] = []
    for e in doc.get("entries") or []:
        if isinstance(e, dict) and isinstance(e.get("slug"), str):
            entries.append(
                {
                    "slug": e["slug"],
                    "listingCategory": str(e.get("listingCategory") or "todos"),
                }
            )
        elif isinstance(e, str):
            entries.append({"slug": e, "listingCategory": "todos"})
    if not entries:
        legacy = doc.get("slugs") if isinstance(doc.get("slugs"), list) else []
        entries = [{"slug": s, "listingCategory": "todos"} for s in legacy if isinstance(s, str)]
    if not entries:
        print("[stage2] No hay entradas en all-slugs.json. Ejecuta stage 1 primero.", file=sys.stderr)
        sys.exit(1)

    if fresh_raw:
        save_raw_deals([])
        print(f"[stage2] --fresh-raw: vaciado {RAW_DEALS_PATH}")

    raw_cars = load_raw_deals()
    done_links = links_successfully_parsed(raw_cars)
    print(
        f"[debug] Stage 2: {len(entries)} slugs en índice · "
        f"{len(done_links)} detalles ya parseados OK en {RAW_DEALS_PATH} (se omiten)"
    )

    _interrupt_ctx["raw_cars"] = raw_cars
    _interrupt_ctx["paths"] = {"raw": RAW_DEALS_PATH, "deals": DEALS_JSON_PATH}
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, _on_sigterm)

    detail_pages_parsed_ok = 0
    detail_skipped_already = 0
    detail_fetch_errors = 0
    detail_parse_no_price = 0
    detail_parse_exceptions = 0
    detail_schema_org_props = 0

    total_slugs = len(entries)
    interrupted = False

    try:
        for i, row in enumerate(entries):
            slug = row["slug"]
            listing_cat = row.get("listingCategory") or "todos"
            detail_url = slug_to_canonical_link(slug)
            if detail_url in done_links:
                detail_skipped_already += 1
                n_done = i + 1
                if n_done % DETAIL_PROGRESS_EVERY == 0 or n_done == total_slugs:
                    print(
                        f"[progress] Detalle {n_done}/{total_slugs} — "
                        f"ok: {detail_pages_parsed_ok}, "
                        f"omitidos_ya_procesados: {detail_skipped_already}, "
                        f"fetch fallido: {detail_fetch_errors}, "
                        f"sin precio USD: {detail_parse_no_price}, "
                        f"excepción parseo: {detail_parse_exceptions}"
                    )
                continue

            html = fetch_detail_html(detail_url)
            if html is None:
                detail_fetch_errors += 1
            else:
                try:
                    car, had_schema = build_car(slug, html, listing_cat)
                    if car:
                        raw_cars.append(car)
                        done_links.add(car["link"])
                        detail_pages_parsed_ok += 1
                        if had_schema:
                            detail_schema_org_props += 1
                        if (
                            INCREMENTAL_RAW_SAVE_EVERY > 0
                            and detail_pages_parsed_ok % INCREMENTAL_RAW_SAVE_EVERY == 0
                        ):
                            save_raw_deals(raw_cars)
                            print(
                                f"[save] raw checkpoint: {len(raw_cars)} filas → {RAW_DEALS_PATH} "
                                f"(parseados OK este run: {detail_pages_parsed_ok})"
                            )
                        if (
                            INCREMENTAL_DEALS_SAVE_EVERY > 0
                            and detail_pages_parsed_ok % INCREMENTAL_DEALS_SAVE_EVERY == 0
                        ):
                            n, d = save_deals_json_atomic(raw_cars, DEALS_JSON_PATH)
                            print(
                                f"[save] deals checkpoint: {n} únicos por link → {DEALS_JSON_PATH} "
                                f"(descartados dedup: {d})"
                            )
                    else:
                        detail_parse_no_price += 1
                except Exception as e:
                    detail_parse_exceptions += 1
                    print(f"[warn] error al parsear ({detail_url}): {e}")

            n_done = i + 1
            if n_done % DETAIL_PROGRESS_EVERY == 0 or n_done == total_slugs:
                print(
                    f"[progress] Detalle {n_done}/{total_slugs} — "
                    f"ok: {detail_pages_parsed_ok}, "
                    f"omitidos_ya_procesados: {detail_skipped_already}, "
                    f"fetch fallido: {detail_fetch_errors}, "
                    f"sin precio USD: {detail_parse_no_price}, "
                    f"excepción parseo: {detail_parse_exceptions}"
                )

            if i < len(entries) - 1:
                time.sleep(REQUEST_DELAY_S)

        print(f"[debug] Parsed successfully (USD price from detail HTML): {detail_pages_parsed_ok}")
        print(f"[debug] Skipped (already in raw-deals with price): {detail_skipped_already}")
        print(
            f"[debug] Listings con schema.org Product.additionalProperty (atributos estructurados): "
            f"{detail_schema_org_props}"
        )
        if detail_fetch_errors or detail_parse_no_price or detail_parse_exceptions:
            print(
                f"[debug]   HTTP failures (tras reintentos): {detail_fetch_errors}; "
                f"no USD price in HTML: {detail_parse_no_price}; "
                f"excepciones al parsear: {detail_parse_exceptions}"
            )
    except KeyboardInterrupt:
        interrupted = True
        print("\n[save] Interrupción por teclado — volcando raw-deals y deals…")
    finally:
        _interrupt_ctx["raw_cars"] = None
        try:
            save_raw_deals(raw_cars)
            print(f"[debug] raw-deals.json filas: {len(raw_cars)} → {RAW_DEALS_PATH}")
            n_unique, dropped = save_deals_json_atomic(raw_cars, DEALS_JSON_PATH)
            print(f"[debug] Final records after deduplication by link: {n_unique}")
            if dropped > 0:
                print(f"[debug] Dropped in dedup (empty or duplicate link): {dropped}")
            print(f"[debug] Final records written: {n_unique}")
            print(f"Done: {n_unique} records written to {DEALS_JSON_PATH}")
        except Exception as e:
            print(f"[save] ERROR: no se pudo escribir salida: {e}")

    if interrupted:
        sys.exit(130)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="NeoAuto scraper (listados + detalle, reanudable).")
    p.add_argument(
        "--stage",
        choices=("1", "2", "all"),
        default="all",
        help="1=solo slugs, 2=solo detalles (usa all-slugs.json), all=ambos",
    )
    p.add_argument(
        "--fresh",
        action="store_true",
        help="Stage 1: reiniciar todas las categorías (Todos/Seminuevo/Usado/Nuevo 0km) desde página 1.",
    )
    p.add_argument(
        "--fresh-raw",
        action="store_true",
        help="Stage 2: vaciar raw-deals.json antes de descargar (vuelve a pedir todos los detalles).",
    )
    return p.parse_args()


def main() -> None:
    args = parse_args()

    if args.stage in ("1", "all"):
        run_stage1_collect_slugs(fresh=args.fresh)

    if args.stage in ("2", "all"):
        run_stage2_fetch_details(fresh_raw=args.fresh_raw)


if __name__ == "__main__":
    main()
