"""Exercise the real API and JWT validation without changing a database."""
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import jwt
from fastapi.testclient import TestClient

import login
from main import app


class LoginTests(unittest.TestCase):
    def setUp(self):
        self.secret = "test-secret-for-login-integration-at-least-32-bytes"
        self.secret_patch = patch.object(login, "JWT_SECRET_KEY", self.secret)
        self.secret_patch.start()
        self.db_patch = patch.object(login, "DBManager")
        self.db = self.db_patch.start().return_value
        self.addCleanup(self.secret_patch.stop)
        self.addCleanup(self.db_patch.stop)
        self.account = ["A001", "admin123", "admin", "approved",
                        datetime.now(timezone.utc) + timedelta(days=1)]
        self.db.cursor.fetchone.return_value = self.account
        self.client = TestClient(app)

    def submit(self, password="admin123", path="/api/login"):
        return self.client.post(path, json={"user_id": "A001", "password": password})

    def test_login_token_and_session_restore(self):
        response = self.submit()
        self.assertEqual(response.status_code, 200)
        session = response.json()
        self.assertEqual(session["role"], "admin")
        payload = jwt.decode(session["access_token"], self.secret, algorithms=["HS256"])
        self.assertEqual(payload["sub"], "A001")
        self.assertAlmostEqual(payload["exp"] - datetime.now(timezone.utc).timestamp(), 8 * 3600, delta=3)
        restored = self.client.get("/api/me", headers={"Authorization": f"Bearer {session['access_token']}"})
        self.assertEqual(restored.status_code, 200)
        self.assertEqual(restored.json()["user_id"], "A001")
        self.assertIn("expires_at", restored.json())
        self.db.cursor.execute.assert_called_once_with(
            "SELECT student_id, passwords, acc_role, approved, expire_date FROM account WHERE student_id = %s",
            ("A001",),
        )
        self.db.close.assert_called_once()

    def test_original_login_route_still_works(self):
        self.assertEqual(self.submit(path="/login").status_code, 200)

    def test_incorrect_password(self):
        self.assertEqual(self.submit("wrong").status_code, 401)
        self.db.close.assert_called_once()

    def test_unknown_account(self):
        self.db.cursor.fetchone.return_value = None
        self.assertEqual(self.submit().status_code, 401)

    def test_pending_account(self):
        self.account[3] = "pending"
        self.assertEqual(self.submit().status_code, 403)

    def test_expired_account(self):
        self.account[4] = datetime.now(timezone.utc) - timedelta(days=1)
        self.assertEqual(self.submit().status_code, 403)

    def test_missing_secret(self):
        with patch.object(login, "JWT_SECRET_KEY", None):
            self.assertEqual(self.submit().status_code, 500)

    def test_missing_invalid_and_expired_tokens(self):
        self.assertIn(self.client.get("/api/me").status_code, (401, 403))
        expired = jwt.encode({"sub": "A001", "role": "admin", "exp": 1}, self.secret, algorithm="HS256")
        for token in ("invalid", expired):
            with self.subTest(token=token):
                self.assertEqual(self.client.get("/api/me", headers={"Authorization": f"Bearer {token}"}).status_code, 401)

    def test_empty_credentials(self):
        self.assertEqual(self.submit("").status_code, 422)


if __name__ == "__main__":
    unittest.main()
