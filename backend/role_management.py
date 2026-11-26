"""
Function:
    - manages user permissions
    - manages user accounts and roles
"""

from datetime import datetime, timezone
from typing import Literal, Optional

import psycopg2.errors
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from database import DBManager, get_db
from login import require_role

router = APIRouter(prefix="/api/users")

Role = Literal["admin", "staff", "dean", "student"]
Approval = Literal["pending", "approved", "rejected"]

# account columns that are safe to send back to the website
PUBLIC_FIELDS = [
    "student_id", "first_name", "last_name", "email", "username",
    "acc_role", "department", "approved", "expire_date",
]


# returns the permissions shared by all users
def general_permissions():
    return [
        "view_dashboard",
        "import_data",
        "export_data"
    ]


# returns all permissions available to the admin
def admin_permissions():
    return [
        "view_dashboard",
        "import_data",
        "export_data",
        "add_accounts",
        "remove_accounts",
        "change_accounts",
        "change_roles"
    ]


# gets the permissions belonging to a user's role
def get_permissions(role: str):

    # checks if the user is an admin
    if role == "admin":
        return admin_permissions()

    # everyone else receives the general permissions
    return general_permissions()


# checks whether a user has a particular permission
def require_permission(permission: str):

    def checker(
        user: dict = Depends(
            require_role("admin", "staff", "dean", "student")
        )
    ):

        # gets the permissions belonging to the logged-in user
        permissions = get_permissions(user["role"])

        # checks if the user has the required permission
        if permission not in permissions:
            raise HTTPException(
                status_code=403,
                detail="You do not have permission."
            )

        return user
    return checker


# request model for creating an account
class AccountCreate(BaseModel):
    student_id: str = Field(min_length=1, max_length=30)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=1024)

    acc_role: Role
    expire_date: datetime

    # the admin can choose the starting approval status; if they don't, it is "approved"
    approved: Approval = "approved"

    department: Optional[str] = Field(
        default=None,
        max_length=150
    )


# request model for updating an account
# every field is Optional because an update may change just one of them
class AccountUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[str] = Field(default=None, min_length=3, max_length=255)
    acc_role: Optional[Role] = None
    approved: Optional[Approval] = None
    expire_date: Optional[datetime] = None

    department: Optional[str] = Field(
        default=None,
        max_length=150
    )


# makes sure a datetime has a timezone (assumes UTC if none was given)
def make_aware(value: datetime):
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value


# converts one database row (a dictionary) into a dictionary that is safe to send out
def account_to_dict(account):
    return {field: account[field] for field in PUBLIC_FIELDS}


# gets an account using its student_id
def get_account_or_404(db: DBManager, student_id):

    # looks for the row whose student_id matches; returns a list (empty if nothing matched)
    rows = db.getRows("account", filters={"student_id": student_id})

    # checks if the account exists
    if not rows:
        raise HTTPException(
            status_code=404,
            detail="Account not found."
        )

    return rows[0]


# returns the permissions of the logged-in user
@router.get("/permissions")
def view_permissions(
    user: dict = Depends(
        require_role("admin", "staff", "dean", "student")
    )
):

    return {
        "user_id": user["sub"],
        "role": user["role"],
        "permissions": get_permissions(user["role"])
    }


# gets all accounts
# only admins can access this function
@router.get(
    "",
    dependencies=[
        Depends(require_permission("change_accounts"))
    ]
)
def list_accounts(
    acc_role: Optional[Role] = None,
    approved: Optional[Approval] = None,
    db: DBManager = Depends(get_db)
):

    # builds a dictionary of only the filters the caller actually provided
    filters = {}

    # filters accounts by role if provided
    if acc_role:
        filters["acc_role"] = acc_role

    # filters accounts by approval status if provided
    if approved:
        filters["approved"] = approved

    # gets all matching accounts, sorted alphabetically by name
    accounts = db.getRows(
        "account",
        filters=filters,
        order_by=["last_name", "first_name"]
    )

    return [account_to_dict(a) for a in accounts]


# gets one account using its student_id
@router.get(
    "/{student_id}",
    dependencies=[
        Depends(require_permission("change_accounts"))
    ]
)
def get_account(
    student_id: str,
    db: DBManager = Depends(get_db)
):

    # gets the account using its student_id
    account = get_account_or_404(db, student_id)

    return account_to_dict(account)


# creates a new account
@router.post(
    "",
    status_code=201,
    dependencies=[
        Depends(require_permission("add_accounts"))
    ]
)
def create_account(
    body: AccountCreate,
    db: DBManager = Depends(get_db)
):

    # checks if the student_id is already being used
    if db.getData("account", "student_id", body.student_id):
        raise HTTPException(
            status_code=409,
            detail="That ID is already in use."
        )

    # checks if the email is already being used
    if db.getData("account", "email", body.email):
        raise HTTPException(
            status_code=409,
            detail="That email is already in use."
        )

    # checks if the username is already being used
    if db.getData("account", "username", body.username):
        raise HTTPException(
            status_code=409,
            detail="That username is already in use."
        )

    # turns the request into a plain dictionary of column name -> value
    account_data = body.model_dump()

    # the "passwords" column in database.sql is where the password goes, so rename the key
    account_data["passwords"] = account_data.pop("password")

    # makes sure the expire date has a timezone
    account_data["expire_date"] = make_aware(account_data["expire_date"])

    try:
        # saves the new account to the database
        db.insert("account", account_data)

    # UniqueViolation = two people tried to use the same ID/email/username at the same moment
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="Unable to create account."
        )

    # reads the account back from the database so the response shows what was really saved
    return account_to_dict(get_account_or_404(db, body.student_id))


# updates an existing account
@router.patch(
    "/{student_id}",
    dependencies=[
        Depends(require_permission("change_accounts"))
    ]
)
def update_account(
    student_id: str,
    body: AccountUpdate,
    db: DBManager = Depends(get_db)
):

    # makes sure the account exists (raises 404 if it does not)
    get_account_or_404(db, student_id)

    # gets only the fields included in the request
    changes = body.model_dump(exclude_unset=True)

    # checks that required fields are not set to null
    for required in ("first_name", "last_name", "email", "acc_role", "approved", "expire_date"):

        if required in changes and changes[required] is None:
            raise HTTPException(
                status_code=422,
                detail=f"{required} cannot be empty."
            )

    # an empty UPDATE would be invalid
    if not changes:
        raise HTTPException(
            status_code=422,
            detail="No changes were provided."
        )

    # makes sure the expire date has a timezone, if it was changed
    if "expire_date" in changes:
        changes["expire_date"] = make_aware(changes["expire_date"])

    try:
        # saves the changes to the database
        db.update("account", changes, {"student_id": student_id})

    # UniqueViolation = the new email is already used by another account
    except psycopg2.errors.UniqueViolation:
        raise HTTPException(
            status_code=409,
            detail="That email is already in use."
        )

    # IntegrityError = the database rejected the change
    except psycopg2.IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Unable to update account."
        )

    # reads the account back with the updated information
    return account_to_dict(get_account_or_404(db, student_id))
