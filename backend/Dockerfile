FROM python:3.11-slim

WORKDIR /app
COPY . .

# ✅ Install all required packages
RUN pip install fastapi uvicorn sqlalchemy psycopg2-binary requests \
    python-jose[cryptography] passlib[bcrypt]==1.7.4 bcrypt==4.0.1 python-multipart

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
