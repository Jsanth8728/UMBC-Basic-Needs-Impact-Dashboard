"""
Function:
    - describes the database tables
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional
from sqlalchemy import BigInteger, Boolean, CheckConstraint, DateTime, ForeignKey, Identity, Integer, LargeBinary, Numeric, String, UniqueConstraint, func, text
from sqlalchemy.orm import Mapped, mapped_column

from database import Base  # parent class shared by all database models


class SysAdmin(Base):
    """
    stores system administrator accounts
    """

    __tablename__ = "sys_admin"

    admin_id: Mapped[str] = mapped_column(String(30), primary_key = True)
    passwd: Mapped[str] = mapped_column(String(255), nullable = False)


class Account(Base):
    """
    stores students and other user accounts
    """

    __tablename__ = "account"

    __table_args__ = (
        CheckConstraint("age IS NULL OR age >= 0", name = "ck_account_age"),
        CheckConstraint("student_level IN ('undergraduate', 'graduate')", name = "ck_account_student_level"),
        CheckConstraint("approved IN ('pending', 'approved', 'rejected')", name = "ck_account_approved"),
    )

    student_id: Mapped[str] = mapped_column(String(30), primary_key = True)

    first_name: Mapped[str] = mapped_column(String(100), nullable = False)
    last_name: Mapped[str] = mapped_column(String(100), nullable = False)

    email: Mapped[str] = mapped_column(String(255), unique = True, nullable = False)
    acc_role: Mapped[str] = mapped_column(String(30), nullable = False)
    department: Mapped[Optional[str]] = mapped_column(String(150), nullable = True)
    ethnicity: Mapped[Optional[str]] = mapped_column(String(100), nullable = True)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable = True)
    student_level: Mapped[Optional[str]] = mapped_column(String(20), nullable = True)
    is_international: Mapped[Optional[bool]] = mapped_column(Boolean, nullable = True)
    is_first_generation: Mapped[Optional[bool]] = mapped_column(Boolean, nullable = True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone = True), nullable = False, server_default = func.now())
    approved: Mapped[str] = mapped_column(String(20), nullable = False, server_default = text("'pending'"))
    expire_date: Mapped[datetime] = mapped_column(DateTime(timezone = True), nullable = False)


class Group(Base):
    """
    stores organizations, offices, and services
    """

    __tablename__ = "groups"

    __table_args__ = (CheckConstraint("organization_type IN ('student_org', 'office', 'service')", name = "ck_groups_organization_type"),)

    organization_id: Mapped[str] = mapped_column(String(30), primary_key = True)
    name: Mapped[str] = mapped_column(String(200), nullable = False)
    organization_type: Mapped[str] = mapped_column(String(30), nullable = False)


class Meeting(Base):
    """
    stores events organized by groups
    """

    __tablename__ = "meetings"

    __table_args__ = (
        CheckConstraint("event_type IN ('meeting', 'workshop', 'service', 'other')", name = "ck_meetings_event_type"), 
        CheckConstraint("duration IS NULL OR duration >= 0", name = "ck_meetings_duration"), 
        CheckConstraint("ends_at IS NULL OR ends_at >= starts_at", name = "ck_meetings_end_after_start"), 
    )

    meeting_id: Mapped[str] = mapped_column(String(30), primary_key = True)
    organization_id: Mapped[str] = mapped_column(String(30), ForeignKey("groups.organization_id"), nullable = False)
    meeting_name: Mapped[str] = mapped_column(String(200), nullable = False)
    event_type: Mapped[str] = mapped_column(String(30), nullable = False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone = True), nullable = False)
    ends_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone = True), nullable = True)
    duration: Mapped[Optional[Decimal]] = mapped_column(Numeric(6, 2), nullable = True)
    food_lb: Mapped[Optional[Decimal]] = mapped_column(Numeric, nullable = True)
    loc: Mapped[str] = mapped_column(String(100), nullable = False)


class File(Base):
    """
    stores file names and file contents
    """

    __tablename__ = "files"

    file_name: Mapped[str] = mapped_column(String(255), primary_key = True)
    contents: Mapped[Optional[bytes]] = mapped_column(LargeBinary, nullable = True)
    up_dte: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone = True), nullable = True)


class Manages(Base):
    """
    records which administrators manage which accounts
    """

    __tablename__ = "manages"

    __table_args__ = (UniqueConstraint("student_id", name="uq_manages_student_id"),)

    admin_id: Mapped[str] = mapped_column(String(30), ForeignKey("sys_admin.admin_id", ondelete = "RESTRICT"), primary_key = True)
    student_id: Mapped[str] = mapped_column(String(30), ForeignKey("account.student_id", ondelete = "CASCADE"), primary_key = True)
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone = True), nullable = False, server_default = func.now())


class PartOf(Base):
    """
    records which accounts belong to which groups
    """

    __tablename__ = "part_of"

    student_id: Mapped[str] = mapped_column(String(30), ForeignKey("account.student_id", ondelete = "CASCADE"), primary_key = True)
    organization_id: Mapped[str] = mapped_column(String(30), ForeignKey("groups.organization_id", ondelete = "CASCADE"), primary_key = True)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone = True), nullable = False, server_default = func.now())


class Attend(Base):
    """
    records which accounts attend which meetings
    """

    __tablename__ = "attends"

    __table_args__ = (CheckConstraint("attendance_status IN ('registered', 'attended', 'absent', 'cancelled')", name="ck_attends_attendance_status"),)

    student_id: Mapped[str] = mapped_column(String(30), ForeignKey("account.student_id", ondelete = "CASCADE"), primary_key = True)
    meeting_id: Mapped[str] = mapped_column(String(30), ForeignKey("meetings.meeting_id", ondelete = "CASCADE"), primary_key = True)
    attendance_status: Mapped[str] = mapped_column(String(20), nullable = False, server_default = text("'registered'"))


class Transfer(Base):
    """
    records files transferred between accounts
    """

    __tablename__ = "transfers"

    __table_args__ = (CheckConstraint("sender_id <> recipient_id", name="ck_transfers_different_accounts"),)

    transfer_id: Mapped[int] = mapped_column(BigInteger, Identity(always = True), primary_key = True)
    sender_id: Mapped[str] = mapped_column(String(30), ForeignKey("account.student_id", ondelete = "RESTRICT"), nullable = False)
    recipient_id: Mapped[str] = mapped_column(String(30), ForeignKey("account.student_id", ondelete = "RESTRICT"), nullable = False)
    file_name: Mapped[str] = mapped_column(String(255), ForeignKey("files.file_name", ondelete = "RESTRICT"), nullable = False)
    transferred_at: Mapped[datetime] = mapped_column(DateTime(timezone = True), nullable = False, server_default = func.now())
