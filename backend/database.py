"""
Function:
    - connects to the databse
"""

import os
from sqlalchemy import create_engine  # builds the connection to the database
from sqlalchemy.orm import DeclarativeBase, sessionmaker  # tools for database table classes and sessions

# gets the database address
DATABASE_URL = os.environ["DATABASE_URL"]

# creates the engine which managages the database connection
engine = create_engine(DATABASE_URL, pool_pre_ping = True)

SessionLocal = sessionmaker(bind = engine, autoflush = False)


class Base(DeclarativeBase):
    """ Parent of all table classes in models.py """


def get_db():  # "def" defines a function; FastAPI will call this for each web request
    """ Give one request its own database session, and ALWAYS close it afterwards. """
    db = SessionLocal()  # opens a new session

    try:
        yield db  # gives the session to FastAPI to use
    finally:
        db.close()
