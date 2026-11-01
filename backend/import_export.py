"""Small, table-oriented CSV import/export for the existing schema."""
import csv
import io
from datetime import datetime, timezone
from decimal import Decimal
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy import Boolean, DateTime, Integer, Numeric, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
from models import Account, Attend, File, Group, Meeting, PartOf

router = APIRouter(prefix="/api")
TABLES = {model.__tablename__: model for model in (Group, Account, Meeting, Attend, PartOf)}


@router.get("/files")
def list_files(db: Session = Depends(get_db)):
    # Select metadata only; loading the list must not retrieve every CSV's bytes.
    rows = db.execute(
        select(File.file_name, File.up_dte)
        .where(File.contents.is_not(None), File.up_dte.is_not(None))
        .order_by(File.up_dte.desc(), File.file_name)
    ).all()
    return [
        {"filename": name, "addedAt": uploaded.replace(tzinfo=timezone.utc).isoformat()
         if uploaded.tzinfo is None else uploaded.isoformat()}
        for name, uploaded in rows
    ]


@router.get("/files/download")
def download_file(filename: str, db: Session = Depends(get_db)):
    stored = db.get(File, filename)
    if stored is None or stored.contents is None:
        raise HTTPException(404, "Saved file not found.")
    return Response(
        stored.contents,
        media_type="application/octet-stream",
        headers={"Content-Disposition": "attachment; filename*=UTF-8''" + quote(stored.file_name, safe="")},
    )


def get_model(table):
    if table not in TABLES:
        raise HTTPException(404, "Unknown import/export table.")
    return TABLES[table]


def convert(column, value):
    if value == "":
        return None
    if isinstance(column.type, Boolean):
        if value.lower() not in ("true", "false", "1", "0"):
            raise ValueError(f"{column.name} must be true or false")
        return value.lower() in ("true", "1")
    if isinstance(column.type, DateTime):
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    if isinstance(column.type, Integer):
        return int(value)
    if isinstance(column.type, Numeric):
        number = Decimal(value)
        if not number.is_finite():
            raise ValueError(f"{column.name} must be finite")
        return number
    return value


@router.post("/import/{table}")
def import_csv(table: str, file: UploadFile, db: Session = Depends(get_db)):
    model = get_model(table)
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(400, "Choose a CSV file.")
    contents = file.file.read(10 * 1024 * 1024 + 1)
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(400, "Choose a file under 10 MB.")
    line = 1
    try:
        reader = csv.DictReader(io.StringIO(contents.decode("utf-8-sig")), strict=True)
        columns = model.__table__.columns
        headers = reader.fieldnames or []
        required = {c.name for c in columns if not c.nullable and c.server_default is None and c.default is None}
        if not headers or len(headers) != len(set(headers)) or set(headers) - set(columns.keys()) or required - set(headers):
            raise ValueError("Use database column names. Required columns: " + ", ".join(sorted(required)))
        count = 0
        for line, row in enumerate(reader, start=2):
            if None in row or None in row.values():
                raise ValueError("Row has a different number of fields than the header")
            values = {key: convert(columns[key], value.strip()) for key, value in row.items()}
            if any(values.get(key) is None for key in required):
                raise ValueError("Required values cannot be blank")
            identity = tuple(values[c.name] for c in model.__table__.primary_key.columns)
            existing = db.get(model, identity)
            if existing is None:
                db.add(model(**values))
            else:
                for key, value in values.items():
                    setattr(existing, key, value)
            db.flush()
            count += 1
        if not count:
            raise ValueError("CSV has no data rows")
        stored = db.get(File, file.filename)
        if stored is None:
            stored = File(file_name=file.filename)
            db.add(stored)
        stored.contents = contents
        stored.up_dte = datetime.now(timezone.utc)
        db.commit()
        return {"table": table, "rows": count, "filename": file.filename}
    except IntegrityError:
        db.rollback()
        raise HTTPException(400, f"Row {line}: database constraint failed. Check values and import referenced accounts/groups/meetings first.")
    except (ValueError, ArithmeticError, UnicodeError, csv.Error) as error:
        db.rollback()
        raise HTTPException(400, f"Row {line}: {error}")


@router.get("/export/{table}")
def export_csv(table: str, db: Session = Depends(get_db)):
    model = get_model(table)
    columns = list(model.__table__.columns.keys())
    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(columns)
    for item in db.scalars(select(model).order_by(*model.__table__.primary_key.columns)):
        values = [getattr(item, key) for key in columns]
        writer.writerow([value.isoformat() if isinstance(value, datetime) else value for value in values])
    return Response(output.getvalue(), media_type="text/csv", headers={"Content-Disposition": f'attachment; filename="{table}.csv"'})
