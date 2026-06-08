"""Backend tests for Mulya Salon POS - Kasir improvements."""
import os
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    # Read from frontend/.env
    fe_env = Path(__file__).resolve().parents[2] / "frontend" / ".env"
    for line in fe_env.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip()
            break
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"


# ---------- Auth fixtures ----------
@pytest.fixture(scope="session")
def owner_token():
    r = requests.post(f"{API}/auth/login", json={
        "email": "owner@mulyasalon.com", "password": "owner123"
    }, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == "owner@mulyasalon.com"
    assert data["user"]["role"] == "owner"
    return data["token"]


@pytest.fixture(scope="session")
def kasir_token():
    r = requests.post(f"{API}/auth/login", json={
        "email": "kasir@mulyasalon.com", "password": "kasir123"
    }, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def owner_headers(owner_token):
    return {"Authorization": f"Bearer {owner_token}", "Content-Type": "application/json"}


# ---------- Auth tests ----------
class TestAuth:
    def test_login_owner_success(self, owner_token):
        assert isinstance(owner_token, str) and len(owner_token) > 10

    def test_login_kasir_success(self, kasir_token):
        assert isinstance(kasir_token, str) and len(kasir_token) > 10

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={
            "email": "owner@mulyasalon.com", "password": "wrong"
        }, timeout=20)
        assert r.status_code == 401


# ---------- Dashboard stats ----------
class TestDashboardStats:
    def test_dashboard_stats_fields(self, owner_headers):
        r = requests.get(f"{API}/dashboard/stats", headers=owner_headers, timeout=20)
        assert r.status_code == 200, r.text
        d = r.json()
        for key in [
            "total_transactions_today", "total_bookings_today", "total_customers",
            "total_revenue_month", "total_revenue_today", "total_commission_today",
            "top_stylist_name", "top_stylist_revenue",
        ]:
            assert key in d, f"Missing key {key} in dashboard stats"
        assert isinstance(d["total_revenue_today"], (int, float))
        assert isinstance(d["total_commission_today"], (int, float))


# ---------- Transactions ----------
class TestTransactions:
    def test_create_transaction_with_stylist_and_commission(self, owner_headers):
        # Ensure we have a stylist, customer, service
        sty = requests.get(f"{API}/stylists", headers=owner_headers, timeout=20).json()
        cus = requests.get(f"{API}/customers", headers=owner_headers, timeout=20).json()
        svc = requests.get(f"{API}/services", headers=owner_headers, timeout=20).json()

        # Create deps if missing
        if not sty:
            r = requests.post(f"{API}/stylists", headers=owner_headers, json={
                "name": "TEST_Stylist", "phone": "0811", "specialty": "hair",
                "commission_rate": 20.0, "status": "active"
            }, timeout=20)
            assert r.status_code == 200
            sty = [r.json()]
        active = [s for s in sty if s.get("status") == "active"]
        assert active, "No active stylist available"
        stylist = active[0]

        if not cus:
            r = requests.post(f"{API}/customers", headers=owner_headers, json={
                "name": "TEST_Customer", "phone": "0822"
            }, timeout=20)
            assert r.status_code == 200
            cus = [r.json()]
        customer = cus[0]

        if not svc:
            r = requests.post(f"{API}/services", headers=owner_headers, json={
                "name": "TEST_Service", "category": "hair", "duration": 30,
                "price": 100000.0
            }, timeout=20)
            assert r.status_code == 200
            svc = [r.json()]
        service = svc[0]

        service_total = float(service["price"]) * 1
        payload = {
            "customer_id": customer["id"],
            "customer_name": customer["name"],
            "stylist_id": stylist["id"],
            "stylist_name": stylist["name"],
            "items": [{
                "type": "service", "id": service["id"], "name": service["name"],
                "price": service["price"], "quantity": 1
            }],
            "subtotal": service_total,
            "discount": 0,
            "total": service_total,
            "payment_method": "tunai",
            "cash_paid": service_total + 50000,
            "change_amount": 50000,
            "payment_status": "lunas",
            "served_by": "Owner"
        }
        r = requests.post(f"{API}/transactions", headers=owner_headers, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        t = r.json()

        # Verify invoice_number auto-generated
        assert t.get("invoice_number"), "invoice_number not generated"
        assert t["invoice_number"].startswith("INV-"), f"Bad invoice format: {t['invoice_number']}"
        # Verify commission calculation = service_total * rate%
        expected_commission = service_total * (stylist["commission_rate"] / 100.0)
        assert abs(t["commission_amount"] - expected_commission) < 0.01, \
            f"Commission mismatch: got {t['commission_amount']}, expected {expected_commission}"
        # Verify cash_paid and change_amount stored
        assert t["cash_paid"] == payload["cash_paid"]
        assert t["change_amount"] == payload["change_amount"]
        # Verify no tax field
        assert "tax" not in t, "Transaction should not have 'tax' field"

        return t["id"]

    def test_commission_only_on_services_not_products(self, owner_headers):
        sty = [s for s in requests.get(f"{API}/stylists", headers=owner_headers).json() if s.get("status") == "active"]
        cus = requests.get(f"{API}/customers", headers=owner_headers).json()
        prods = requests.get(f"{API}/products", headers=owner_headers).json()
        svc = requests.get(f"{API}/services", headers=owner_headers).json()
        if not (sty and cus and prods and svc):
            pytest.skip("Missing seed data for product commission test")
        stylist, customer, product, service = sty[0], cus[0], prods[0], svc[0]
        if product["stock"] <= 0:
            pytest.skip("Product out of stock")

        items = [
            {"type": "service", "id": service["id"], "name": service["name"], "price": service["price"], "quantity": 1},
            {"type": "product", "id": product["id"], "name": product["name"], "price": product["sell_price"], "quantity": 1},
        ]
        subtotal = service["price"] + product["sell_price"]
        payload = {
            "customer_id": customer["id"], "customer_name": customer["name"],
            "stylist_id": stylist["id"], "stylist_name": stylist["name"],
            "items": items, "subtotal": subtotal, "discount": 0, "total": subtotal,
            "payment_method": "qris", "cash_paid": 0, "change_amount": 0,
            "payment_status": "lunas", "served_by": "Owner"
        }
        r = requests.post(f"{API}/transactions", headers=owner_headers, json=payload, timeout=20)
        assert r.status_code == 200, r.text
        t = r.json()
        expected = service["price"] * (stylist["commission_rate"] / 100.0)
        assert abs(t["commission_amount"] - expected) < 0.01, \
            f"Commission should be on service only. got={t['commission_amount']}, expected={expected}"


# ---------- Reports ----------
class TestReports:
    def test_stylist_commission_report_structure(self, owner_headers):
        r = requests.get(f"{API}/reports/stylist-commission", headers=owner_headers, timeout=20)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        if data:
            row = data[0]
            for k in ["stylist_name", "total_transactions", "total_revenue", "total_commission"]:
                assert k in row, f"Missing {k} in commission report row"
