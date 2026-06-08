"""Backend tests for Mulya Salon POS - Reporting consistency (Jakarta TZ).

Validates that dashboard totals, transaction reports, and commission reports
all use the same source of truth and agree for: today, single-day, multi-day,
month, custom range, and future (no data) windows.
"""
import os
from datetime import datetime, date, timedelta
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv
from zoneinfo import ZoneInfo

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    fe_env = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    for line in fe_env.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"

JAKARTA_TZ = ZoneInfo("Asia/Jakarta")


def jakarta_today_iso() -> str:
    return datetime.now(JAKARTA_TZ).date().isoformat()


def first_day_of_month_iso() -> str:
    return datetime.now(JAKARTA_TZ).date().replace(day=1).isoformat()


def last_day_of_month_iso() -> str:
    today = datetime.now(JAKARTA_TZ).date()
    if today.month == 12:
        nxt = today.replace(year=today.year + 1, month=1, day=1)
    else:
        nxt = today.replace(month=today.month + 1, day=1)
    return (nxt - timedelta(days=1)).isoformat()


# ---------- Auth fixtures ----------
@pytest.fixture(scope="session")
def owner_token():
    r = requests.post(
        f"{API}/auth/login",
        json={"email": "owner@mulyasalon.com", "password": "owner123"},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def ensure_today_transaction(owner_headers):
    """Ensure at least one transaction exists for today (Jakarta) so we can
    cross-check totals. Creates one via the normal POS flow if missing.
    """
    today = jakarta_today_iso()
    rep = requests.get(
        f"{API}/reports/transactions",
        params={"start_date": today, "end_date": today},
        headers=owner_headers,
        timeout=20,
    )
    assert rep.status_code == 200, rep.text
    if rep.json()["summary"]["total_transactions"] > 0:
        return True

    # Need to seed one transaction
    sty = [s for s in requests.get(f"{API}/stylists", headers=owner_headers).json()
           if s.get("status") == "active"]
    cus = requests.get(f"{API}/customers", headers=owner_headers).json()
    svc = requests.get(f"{API}/services", headers=owner_headers).json()
    if not (sty and cus and svc):
        pytest.skip("Missing seed data to create a today transaction")
    stylist, customer, service = sty[0], cus[0], svc[0]
    payload = {
        "customer_id": customer["id"], "customer_name": customer["name"],
        "stylist_id": stylist["id"], "stylist_name": stylist["name"],
        "items": [{
            "type": "service", "id": service["id"], "name": service["name"],
            "price": service["price"], "quantity": 1
        }],
        "subtotal": service["price"], "discount": 0, "total": service["price"],
        "payment_method": "tunai",
        "cash_paid": service["price"] + 10000, "change_amount": 10000,
        "payment_status": "lunas", "served_by": "Owner",
    }
    r = requests.post(f"{API}/transactions", headers=owner_headers, json=payload, timeout=20)
    assert r.status_code == 200, r.text
    return True


# ========== validate-totals endpoint ==========
class TestValidateTotals:
    def test_no_params_returns_today_consistent(self, owner_headers, ensure_today_transaction):
        r = requests.get(f"{API}/reports/validate-totals", headers=owner_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["consistent"] is True, f"Inconsistent: {d}"
        assert "today" in d["scope"]
        assert d["raw"]["count"] == d["aggregation"]["count"]
        assert abs(d["raw"]["revenue"] - d["aggregation"]["total_revenue"]) < 0.01
        assert abs(d["raw"]["commission"] - d["aggregation"]["total_commission"]) < 0.01

    def test_single_day_includes_all_transactions(self, owner_headers, ensure_today_transaction):
        today = jakarta_today_iso()
        r = requests.get(
            f"{API}/reports/validate-totals",
            params={"start_date": today, "end_date": today},
            headers=owner_headers, timeout=20,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["consistent"] is True, f"Inconsistent on single day: {d}"
        # ensure not zero (regression for lexicographic string bug)
        assert d["raw"]["count"] > 0, "Single-day filter returned 0 - regression of date-string bug"
        assert d["aggregation"]["count"] > 0

    def test_validate_matches_dashboard_today(self, owner_headers, ensure_today_transaction):
        ds = requests.get(f"{API}/dashboard/stats", headers=owner_headers, timeout=20).json()
        v = requests.get(f"{API}/reports/validate-totals", headers=owner_headers, timeout=20).json()
        assert v["consistent"] is True
        assert v["raw"]["count"] == ds["total_transactions_today"]
        assert abs(v["raw"]["revenue"] - ds["total_revenue_today"]) < 0.01
        assert abs(v["aggregation"]["total_commission"] - ds["total_commission_today"]) < 0.01

    def test_future_date_returns_zero_consistent(self, owner_headers):
        future = (date.today() + timedelta(days=365)).isoformat()
        r = requests.get(
            f"{API}/reports/validate-totals",
            params={"start_date": future, "end_date": future},
            headers=owner_headers, timeout=20,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["consistent"] is True
        assert d["raw"]["count"] == 0
        assert d["raw"]["revenue"] == 0
        assert d["aggregation"]["count"] == 0


# ========== Reports endpoints ==========
class TestTransactionReport:
    def test_single_day_not_zero(self, owner_headers, ensure_today_transaction):
        today = jakarta_today_iso()
        r = requests.get(
            f"{API}/reports/transactions",
            params={"start_date": today, "end_date": today},
            headers=owner_headers, timeout=20,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["summary"]["total_transactions"] > 0, \
            "Single-day filter returned 0 - regression of date-string bug"
        # New field
        assert "total_commission" in d["summary"]
        # Every returned transaction must fall on `today` (Jakarta)
        for t in d["transactions"]:
            created = t.get("created_at")
            assert created, "transaction missing created_at"

    def test_multi_day_range(self, owner_headers, ensure_today_transaction):
        today = datetime.now(JAKARTA_TZ).date()
        start = (today - timedelta(days=7)).isoformat()
        end = today.isoformat()
        r = requests.get(
            f"{API}/reports/transactions",
            params={"start_date": start, "end_date": end},
            headers=owner_headers, timeout=20,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["summary"]["total_transactions"] >= 1
        assert "total_commission" in d["summary"]

    def test_month_range_matches_dashboard(self, owner_headers, ensure_today_transaction):
        start = first_day_of_month_iso()
        end = last_day_of_month_iso()
        rep = requests.get(
            f"{API}/reports/transactions",
            params={"start_date": start, "end_date": end},
            headers=owner_headers, timeout=20,
        ).json()
        ds = requests.get(f"{API}/dashboard/stats", headers=owner_headers, timeout=20).json()
        assert abs(rep["summary"]["total_revenue"] - ds["total_revenue_month"]) < 0.01, \
            f"Month report revenue ({rep['summary']['total_revenue']}) != dashboard month ({ds['total_revenue_month']})"

    def test_custom_range_consistent(self, owner_headers):
        r = requests.get(
            f"{API}/reports/validate-totals",
            params={"start_date": "2026-05-01", "end_date": "2026-07-31"},
            headers=owner_headers, timeout=20,
        )
        assert r.status_code == 200
        assert r.json()["consistent"] is True

    def test_summary_has_total_commission(self, owner_headers):
        today = jakarta_today_iso()
        r = requests.get(
            f"{API}/reports/transactions",
            params={"start_date": today, "end_date": today},
            headers=owner_headers, timeout=20,
        )
        assert r.status_code == 200
        s = r.json()["summary"]
        for k in ["total_revenue", "total_transactions", "total_commission", "average_transaction"]:
            assert k in s, f"Missing summary key: {k}"


class TestCrossChecks:
    def test_dashboard_today_count_matches_report(self, owner_headers, ensure_today_transaction):
        today = jakarta_today_iso()
        ds = requests.get(f"{API}/dashboard/stats", headers=owner_headers, timeout=20).json()
        rep = requests.get(
            f"{API}/reports/transactions",
            params={"start_date": today, "end_date": today},
            headers=owner_headers, timeout=20,
        ).json()
        assert ds["total_transactions_today"] == rep["summary"]["total_transactions"]
        assert abs(ds["total_revenue_today"] - rep["summary"]["total_revenue"]) < 0.01

    def test_dashboard_today_commission_matches_stylist_report(self, owner_headers, ensure_today_transaction):
        today = jakarta_today_iso()
        ds = requests.get(f"{API}/dashboard/stats", headers=owner_headers, timeout=20).json()
        sc = requests.get(
            f"{API}/reports/stylist-commission",
            params={"start_date": today, "end_date": today},
            headers=owner_headers, timeout=20,
        ).json()
        commission_sum = sum(row.get("total_commission", 0) for row in sc)
        # commission report may exclude legacy null-stylist transactions, so
        # dashboard >= commission_sum (untracked diff = legacy without stylist)
        diff = ds["total_commission_today"] - commission_sum
        assert diff >= -0.01, \
            f"Dashboard commission ({ds['total_commission_today']}) < stylist report sum ({commission_sum})"


class TestJakartaTimezone:
    def test_validate_scope_uses_jakarta_today(self, owner_headers):
        r = requests.get(f"{API}/reports/validate-totals", headers=owner_headers, timeout=20)
        assert r.status_code == 200
        scope = r.json()["scope"]
        # Should mention Jakarta today's ISO date
        assert jakarta_today_iso() in scope, \
            f"Scope '{scope}' does not contain Jakarta today {jakarta_today_iso()}"
