# Script para testar CORS do backend
Write-Host "=== Testando CORS do Backend ===" -ForegroundColor Cyan

$backendUrl = "https://backend-29irgse6f-jpxdpts-projects.vercel.app"
$frontendOrigin = "https://frontend-cr0rrlqn2-jpxdpts-projects.vercel.app"

Write-Host "`n1. Testando Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-WebRequest -Uri "$backendUrl/api/health" -Method GET -UseBasicParsing
    Write-Host "Status: $($health.StatusCode)" -ForegroundColor Green
    Write-Host "CORS Headers:" -ForegroundColor Cyan
    $health.Headers | Where-Object { $_.Key -like "*Access-Control*" } | Format-Table
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Testando OPTIONS (Preflight)..." -ForegroundColor Yellow
try {
    $options = Invoke-WebRequest -Uri "$backendUrl/api/auth/login" -Method OPTIONS `
        -Headers @{
            "Origin" = $frontendOrigin
            "Access-Control-Request-Method" = "POST"
            "Access-Control-Request-Headers" = "Content-Type,Authorization"
        } -UseBasicParsing
    
    Write-Host "Status: $($options.StatusCode)" -ForegroundColor Green
    Write-Host "CORS Headers:" -ForegroundColor Cyan
    $options.Headers | Where-Object { $_.Key -like "*Access-Control*" } | Format-Table
    
    if ($options.Headers['Access-Control-Allow-Origin']) {
        Write-Host "✓ Access-Control-Allow-Origin: $($options.Headers['Access-Control-Allow-Origin'])" -ForegroundColor Green
    } else {
        Write-Host "✗ Access-Control-Allow-Origin NÃO encontrado!" -ForegroundColor Red
    }
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Detalhes: $($_.Exception)" -ForegroundColor Red
}

Write-Host "`n=== Teste Concluido ===" -ForegroundColor Cyan

