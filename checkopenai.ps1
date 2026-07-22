$body = @{ prompt = "Why sky is blue?" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:8005/openchat" -Method POST -ContentType "application/json" -Body $body