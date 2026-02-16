import os
from dotenv import load_dotenv

class Config:
    def __init__(self):
        load_dotenv()
        self.DB_URL = os.getenv("DB_URL")
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    def validate(self):
        if not self.DB_URL:
            raise ValueError("DB_URL is required in environment variables.")

config = Config()
config.validate()