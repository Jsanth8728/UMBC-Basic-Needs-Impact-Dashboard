"""Additive monthly measures from meetings and attended visits."""
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import get_db
from models import Attend, Group, Meeting

router = APIRouter(prefix="/api")


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    groups = db.scalars(select(Group).order_by(Group.name)).all()
    attendance = dict(db.execute(
        select(Attend.meeting_id, func.count()).where(Attend.attendance_status == "attended").group_by(Attend.meeting_id)
    ).all())
    totals = defaultdict(float)
    for meeting in db.scalars(select(Meeting)):
        starts = meeting.starts_at
        if starts.tzinfo is not None:
            starts = starts.astimezone(timezone.utc)
        key = (meeting.organization_id, starts.strftime("%Y-%m"))
        totals[(*key, "meetings")] += 1
        totals[(*key, "visits")] += attendance.get(meeting.meeting_id, 0)
        if meeting.food_lb is not None:
            totals[(*key, "food_lb")] += float(meeting.food_lb)
        if meeting.duration is not None:
            totals[(*key, "event_hours")] += float(meeting.duration)
    return {
        "configured": True,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
        "departments": [{"id": group.organization_id, "name": group.name} for group in groups],
        "measures": [
            {"id": "meetings", "label": "Meetings / events", "unit": "events"},
            {"id": "visits", "label": "Attended visits", "unit": "visits"},
            {"id": "food_lb", "label": "Food (lb)", "unit": "lb"},
            {"id": "event_hours", "label": "Event hours", "unit": "hours"},
        ],
        "records": [{"departmentId": group, "month": month, "measureId": measure, "value": value}
                    for (group, month, measure), value in sorted(totals.items())],
        "stories": [],
    }
