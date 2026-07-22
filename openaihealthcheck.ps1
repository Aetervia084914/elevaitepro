# openai-healthcheck.ps1

Write-Host "=== OPENAI CONTAINER HEALTH CHECK ===" -ForegroundColor Green

Write-Host "`n[1] Container Status" -ForegroundColor Yellow
docker ps --filter "name=openai"

Write-Host "`n[2] Container Logs (last 20 lines)" -ForegroundColor Yellow
docker logs --tail 20 openai

Write-Host "`n[3] Process Check" -ForegroundColor Yellow
docker exec openai tasklist

Write-Host "`n[4] Port Check" -ForegroundColor Yellow
docker exec openai netstat -ano

Write-Host "`n[5] Environment Variables" -ForegroundColor Yellow
docker exec openai cmd /c set OPENAI

Write-Host "`n[6] Swagger Check" -ForegroundColor Yellow
docker exec openai curl http://127.0.0.1:8005/docs

Write-Host "`n[7] OpenAPI Check" -ForegroundColor Yellow
docker exec openai curl http://127.0.0.1:8005/openapi.json

Write-Host "`n[8] Container IP" -ForegroundColor Yellow
docker inspect openai --format "{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}"

Write-Host "`n[9] Network Information" -ForegroundColor Yellow
docker inspect openai --format "{{json .NetworkSettings.Networks}}"

Write-Host "`n[10] Health Check Complete" -ForegroundColor Green
