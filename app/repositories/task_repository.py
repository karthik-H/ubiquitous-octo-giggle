from app.domain.models.task import Task, TaskCreate
from typing import List
import logging

class TaskRepository:
    def __init__(self):
        self._tasks = []
        self._id_counter = 1
        self.logger = logging.getLogger("TaskRepository")

    def add_task(self, task_data: TaskCreate) -> Task:
        task = Task(id=self._id_counter, **task_data.dict())
        self._tasks.append(task)
        self._id_counter += 1
        self.logger.info(f"Task created: {task}")
        return task

    def list_tasks(self) -> List[Task]:
        return self._tasks