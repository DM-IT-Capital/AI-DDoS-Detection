import os, time
from urllib.parse import quote_plus
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

DB_USER = os.getenv("POSTGRES_USER")
DB_PASSWORD = quote_plus(os.getenv("POSTGRES_PASSWORD", ""))
DB_NAME = os.getenv("POSTGRES_DB")
DB_HOST = "antarex_db"
DB_PORT = "5432"
SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# retry loop
for attempt in range(10):
    try:
        engine = create_engine(SQLALCHEMY_DATABASE_URL)
        connection = engine.connect()
        connection.close()
        print("✅ Connected to PostgreSQL")
        break
    except OperationalError:
        print(f"⏳ Database not ready, retrying ({attempt + 1}/10)...")
        time.sleep(3)
else:
    raise Exception("❌ Could not connect to PostgreSQL after 10 attempts")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
