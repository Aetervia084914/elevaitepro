# OpenAI Response Logger

A pluggable module for logging OpenAI API responses to JSON files for debugging, auditing, and analysis.

## Features

- **Plug-in/Plug-out**: Just add or remove a single function call — no changes to your core logic
- **Global enable/disable**: Control via `RESPONSE_LOG_ENABLED` environment variable
- **Timestamped files**: Each response gets a unique file with timestamp and session ID
- **Configurable output**: Choose what to include (raw response, parsed output, or both)
- **Safe**: Never crashes your endpoint — all errors are logged and handled gracefully

## Quick Start

### 1. Import the module

```python
from app.services.response_logging import write_response_json, ResponseWriterConfig
```

### 2. Call it after receiving a response

```python
# After calling OpenAI and parsing the response
route_response = resp.json()  # Raw response from OpenAI
output = _extract_output(route_response)  # Your parsed output

# Write to response.json (or timestamped variant)
cfg = ResponseWriterConfig(
    endpoint="getresume_futureroles",
    session_id=session_id,  # Optional: for traceability
    timestamped=True,
)
write_response_json(route_response, output, cfg)
```

### 3. Find your logs

By default, logs are written to:
```
<repo_root>/response_logs/
```

Files are named like:
```
getresume_futureroles_abc123_20260722T143052.json
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `RESPONSE_LOG_ENABLED` | `true` | Set to `false` or `0` to disable all logging |
| `RESPONSE_LOG_DIR` | `<repo_root>/response_logs` | Custom directory for log files |

### ResponseWriterConfig Options

| Parameter | Default | Description |
|-----------|---------|-------------|
| `endpoint` | `"openai"` | Label for the file name (e.g., `"getresume_futureroles"`) |
| `session_id` | `None` | Optional session ID included in file name |
| `output_dir` | `None` | Override output directory (uses `RESPONSE_LOG_DIR` env var if not set) |
| `filename_prefix` | `None` | Override auto-generated prefix |
| `timestamped` | `True` | Create timestamped files (if `False`, overwrites `response.json`) |
| `include_raw_response` | `True` | Include the raw OpenAI HTTP response body |
| `include_parsed_output` | `True` | Include your parsed/normalized output |
| `enabled` | `True` | Set to `False` to skip writing for this specific call |

## Output Format

Each JSON file contains:

```json
{
  "endpoint": "getresume_futureroles",
  "session_id": "abc123",
  "written_at": "2026-07-22T14:30:52.123456+00:00",
  "raw_response": {
    "result": {
      "answer": "{ ... }"
    }
  },
  "parsed_output": {
    "success": true,
    "roles": ["Software Engineer", "DevOps Engineer"],
    ...
  }
}
```

## How to Disable

### Globally (all endpoints)

Set environment variable:
```bash
RESPONSE_LOG_ENABLED=false
```

### For a specific call

```python
cfg = ResponseWriterConfig(endpoint="test", enabled=False)
write_response_json(raw_response, output, cfg)
```

### Remove entirely

Just delete the `write_response_json()` call from your code. That's it!

## Background Task Usage

For non-blocking writes (recommended for production):

```python
from fastapi import BackgroundTasks

@router.post("/endpoint")
async def my_endpoint(background_tasks: BackgroundTasks):
    # ... your logic ...
    
    cfg = ResponseWriterConfig(endpoint="my_endpoint", session_id=session_id)
    background_tasks.add_task(write_response_json, raw_response, output, cfg)
    
    return result
```

## Integration Example

See `app/api/routes/getresume_futureroles.py` for a complete integration example.

The key integration point is in the `predict_future_roles()` function:

```python
# 4. Parse response
route_response = resp.json()
output = _extract_output(route_response)

# 4a. Write raw + parsed response to response.json (plug-in/plug-out)
_write_cfg = ResponseWriterConfig(
    endpoint="getresume_futureroles",
    session_id=session_id,
    timestamped=True,
)
write_response_json(route_response, output, _write_cfg)

# 5. Continue with your logic...
```

## Notes

- Log files are never automatically deleted — manage them manually or via cron
- Logs can contain sensitive data — ensure proper access controls on `response_logs/`
- Writing is synchronous by default; use `BackgroundTasks` for async/non-blocking writes
- No dependencies beyond Python stdlib — works everywhere FastAPI works
