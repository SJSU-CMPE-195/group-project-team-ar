import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

SERVER_DIR = Path(__file__).resolve().parent
load_dotenv(SERVER_DIR / ".env")


def _setting(name: str, default: str) -> str:
    return os.getenv(name, default)


database_url = URL.create(
    drivername="mysql+mysqlconnector",
    username=_setting("MYSQL_USER", "root"),
    password=_setting("MYSQL_PASSWORD", ""),
    host=_setting("MYSQL_HOST", "127.0.0.1"),
    port=int(_setting("MYSQL_PORT", "3306")),
    database=_setting("MYSQL_DATABASE", "aislevision"),
)

engine = create_engine(database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    with SessionLocal() as session:
        yield session
