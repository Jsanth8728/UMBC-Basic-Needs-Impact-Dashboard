from fastapi import FastAPI

app = FastAPI()

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/dashboard")
def dashboard():
    """Dashboard contract scaffold; no database is configured yet.

    Replace this body with authorized, aggregate database queries once the
    schema and permissions are ready. See docs/dashboard.md for the contract.
    Never return student identifiers or unapproved stories from this endpoint.
    """
    return {
        "configured": False,
        "updatedAt": None,
        "departments": [],
        "measures": [],
        "records": [],
        "stories": [],
    }
