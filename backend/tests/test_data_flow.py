"""Run from the repository root: python -m unittest discover -s backend/tests."""
import csv
import io
import os
from pathlib import Path
import sys
import unittest

os.environ.setdefault("DATABASE_URL", "sqlite://")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from database import Base, get_db
from main import app

EXAMPLES = Path(__file__).resolve().parents[2] / "examples" / "csv"


class DataFlowTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)

        @event.listens_for(self.engine, "connect")
        def foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

        Base.metadata.create_all(self.engine)

        def session():
            with Session(self.engine) as db:
                yield db

        app.dependency_overrides[get_db] = session
        self.client = TestClient(app)

    def tearDown(self):
        self.client.close()
        app.dependency_overrides.clear()
        self.engine.dispose()

    def upload(self, table, contents):
        return self.client.post(f"/api/import/{table}", files={"file": (f"{table}.csv", contents, "text/csv")})

    def seed(self):
        for table in ("groups", "account", "meetings", "attends", "part_of"):
            response = self.upload(table, (EXAMPLES / f"{table}.csv").read_bytes())
            self.assertEqual(response.status_code, 200, response.text)

    def test_import_dashboard_export_and_reimport(self):
        self.seed()
        data = self.client.get("/api/dashboard").json()
        self.assertTrue(data["configured"])
        self.assertEqual(data["departments"], [{"id": "DEMO_OFFICE", "name": "Demo Student Support"}])
        self.assertEqual({row["measureId"]: row["value"] for row in data["records"]},
                         {"meetings": 1, "visits": 1, "food_lb": 25, "event_hours": 2})
        self.assertTrue(all(row["month"] == "2026-10" for row in data["records"]))
        self.assertNotIn("DEMO_STUDENT", str(data))
        # Every exported table can be reimported without creating duplicate rows.
        for table in ("groups", "account", "meetings", "attends", "part_of"):
            exported = self.client.get(f"/api/export/{table}")
            self.assertEqual(exported.status_code, 200)
            self.assertIn("attachment", exported.headers["content-disposition"])
            self.assertEqual(len(list(csv.DictReader(io.StringIO(exported.text)))), 1)
            response = self.upload(table, exported.content)
            self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get("/api/dashboard").json()["records"], data["records"])
        # Update an existing meeting and attendance instead of adding duplicates.
        meeting = (EXAMPLES / "meetings.csv").read_text().replace(",2,25,", ",3,40,")
        self.assertEqual(self.upload("meetings", meeting).status_code, 200)
        attendance = (EXAMPLES / "attends.csv").read_text().replace(",attended", ",registered")
        self.assertEqual(self.upload("attends", attendance).status_code, 200)
        values = {row["measureId"]: row["value"] for row in self.client.get("/api/dashboard").json()["records"]}
        self.assertEqual(values, {"meetings": 1, "visits": 0, "food_lb": 40, "event_hours": 3})

    def test_failed_import_rolls_back_entire_file(self):
        invalid = "organization_id,name,organization_type\nGOOD,Good,office\nBAD,Bad,invalid\n"
        response = self.upload("groups", invalid)
        self.assertEqual(response.status_code, 400)
        self.assertIn("Row 3", response.json()["detail"])
        exported = self.client.get("/api/export/groups")
        self.assertEqual(list(csv.DictReader(io.StringIO(exported.text))), [])
        self.assertEqual(self.upload("meetings", (EXAMPLES / "meetings.csv").read_bytes()).status_code, 400)
        self.assertEqual(self.client.get("/api/dashboard").json()["records"], [])
        self.assertEqual(self.client.get("/api/files").json(), [])

    def test_saved_import_history_survives_new_client_and_downloads_original(self):
        self.assertEqual(self.client.get("/api/files").json(), [])
        original = (EXAMPLES / "groups.csv").read_bytes()
        filename = "sample café #1.csv"
        response = self.client.post("/api/import/groups", files={"file": (filename, original, "text/csv")})
        self.assertEqual(response.status_code, 200, response.text)
        # A new browser session has no local history or in-memory File objects.
        with TestClient(app) as refreshed:
            response = refreshed.get("/api/files")
            self.assertEqual(response.status_code, 200)
            history = response.json()
            self.assertEqual(len(history), 1)
            self.assertEqual(history[0]["filename"], filename)
            self.assertTrue(history[0]["addedAt"].endswith("+00:00"))
            self.assertNotIn("contents", history[0])
            download = refreshed.get("/api/files/download", params={"filename": filename})
            self.assertEqual(download.status_code, 200)
            self.assertEqual(download.content, original)
            self.assertIn("filename*=UTF-8''", download.headers["content-disposition"])
            self.assertIn("%23", download.headers["content-disposition"])
            self.assertEqual(refreshed.get("/api/files/download", params={"filename": "missing.csv"}).status_code, 404)
        # Replacing the same filename keeps one entry and updates the saved bytes.
        replacement = original.replace(b"Demo Student Support", b"Updated Support Office")
        response = self.client.post("/api/import/groups", files={"file": (filename, replacement, "text/csv")})
        self.assertEqual(response.status_code, 200, response.text)
        updated = self.client.get("/api/files").json()
        self.assertEqual(len(updated), 1)
        self.assertGreaterEqual(updated[0]["addedAt"], history[0]["addedAt"])
        self.assertEqual(self.client.get("/api/files/download", params={"filename": filename}).content, replacement)
        self.assertEqual(self.upload("groups", original).status_code, 200)
        ordered = self.client.get("/api/files").json()
        self.assertEqual([row["filename"] for row in ordered], ["groups.csv", filename])

    def test_headers_types_and_empty_database(self):
        self.assertEqual(self.client.get("/api/dashboard").json()["records"], [])
        self.assertEqual(self.upload("groups", "name\nMissing ID\n").status_code, 400)
        self.assertEqual(self.upload("sys_admin", "admin_id,passwd\nx,y").status_code, 404)
        self.seed()
        account = self.client.get("/api/export/account").text
        rows = list(csv.DictReader(io.StringIO(account)))
        rows[0]["is_international"] = "true"
        rows[0]["is_first_generation"] = "false"
        stream = io.StringIO()
        writer = csv.DictWriter(stream, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        self.assertEqual(self.upload("account", stream.getvalue()).status_code, 200)
        result = list(csv.DictReader(io.StringIO(self.client.get("/api/export/account").text)))[0]
        self.assertEqual(result["is_international"], "True")
        self.assertEqual(result["is_first_generation"], "False")


if __name__ == "__main__":
    unittest.main()
