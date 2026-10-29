"""
Function:
    - builds the website and plugs in every feature file
"""

from fastapi import FastAPI

import login
# import dashboard
# import role_management
# import import_export

app = FastAPI()

app.include_router(login.router)
# app.include_router(dashboard.router)
# app.include_router(role_management.router)
# app.include_router(import_export.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
