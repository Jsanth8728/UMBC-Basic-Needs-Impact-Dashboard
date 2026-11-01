from fastapi import FastAPI

from dashboard import router as dashboard_router
from import_export import router as transfer_router

app = FastAPI()
app.include_router(dashboard_router)
app.include_router(transfer_router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
