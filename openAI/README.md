# openchat

FastAPI service that accepts JSON input and returns JSON output from OpenAI.

## Setup

1. Create and activate a venv
2. Install deps:

```bash
pip install -r requirements.txt
```

3. Create `.env`:

```bash
copy .env.example .env
```

Put your `OPENAI_API_KEY` in `.env`.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Request example

```bash
curl -X POST http://127.0.0.1:8000/openchat \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": \"Extract payer, payee, amount, date as JSON from: Alice paid Bob 10 dollars on 2024-01-01\", \"max_tokens\": 200, \"temperature\": 0.1}"
```
