from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1, max_length=1000)
    priority: int = Field(..., ge=1, le=5)
    due_date: date
    user_name: str = Field(..., min_length=1, max_length=50)
    location: Optional[str] = None

    @field_validator("location")
    @classmethod
    def location_must_be_ames(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v != "Ames":
            raise ValueError("location must be 'Ames'")
        return v

class Task(TaskCreate):
    id: int