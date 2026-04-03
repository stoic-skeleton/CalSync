FROM python:3.12-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy dependency spec first (layer cache)
COPY pyproject.toml .

# Install dependencies
RUN uv pip install --system -r pyproject.toml

# Copy source
COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
