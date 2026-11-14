"""
Function:
    - builds the website and plugs in every feature file
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import login
# import role_management

app = FastAPI()

# allows frontend to communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(login.router)
# app.include_router(role_management.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
