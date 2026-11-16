
"""
Function:
    - deals with the login
    - checks the role of the user
"""

import os
import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from database import DBManager

router = APIRouter()

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")


class LoginRequest(BaseModel):
    user_id: str = Field(min_length=1, max_length=30)
    password: str = Field(min_length=1, max_length=1024)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    role: str


def check_password(plain, stored_password):
    return plain == stored_password # checks if the password entered matches the stored_password


@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest):

    # checks if the JWT secret key has been configured
    if not JWT_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Authentication is not configured.")

    # connects to the database
    db = DBManager()

    try:
        # gets the account using the user_id
        result = db.getData("account", "student_id", credentials.user_id)

        # checks if the account exists
        if not result:
            raise HTTPException(status_code=401, detail="Invalid ID or password.")

        # Match values to column names; existing databases can have a different order.
        account = dict(zip((column.name for column in db.cursor.description), result[0]))

        # gets the account attributes
        user_id = account["student_id"]
        stored_password = account["passwords"]
        role = account["acc_role"]
        approved = account["approved"]
        expire_date = account["expire_date"]

        # checks if the account has been approved
        if approved != "approved":
            raise HTTPException(status_code=403, detail="Account has not been approved.")

        # checks if the account has expired
        if expire_date <= datetime.now(timezone.utc):
            raise HTTPException(status_code=403, detail="Account has expired.")

        # checks if the password entered matches the stored_password
        if not check_password(credentials.password, stored_password):
            raise HTTPException(status_code=401, detail="Invalid ID or password.")

        # the token is valid for 8 hours, then the user must log in again
        expires_at = datetime.now(timezone.utc) + timedelta(hours=8)

        # token that stores the user's identity, role, and the token expiration time
        access_token = jwt.encode(
            {"sub": user_id, "role": role, "exp": expires_at},
            JWT_SECRET_KEY,
            algorithm="HS256",
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user_id=user_id,
            role=role
        )

    finally:
        # closes the database connection
        db.close()


bearer_scheme = HTTPBearer()


def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    """ checks the token and returns its decoded payload """

    # checks if the JWT secret key has been configured
    if not JWT_SECRET_KEY:
        raise HTTPException(status_code=500, detail="Authentication is not configured.")

    try:
        # verifies the signature and expiration
        return jwt.decode(
            creds.credentials,
            JWT_SECRET_KEY,
            algorithms=["HS256"],
        )

    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


# double function = reuse the same role-checking code for different roles
def require_role(*allowed_roles):
    """ checks a user's role """

    def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in allowed_roles:
            raise HTTPException(status_code=403, detail="You do not have permission.")
        return user

    return checker
