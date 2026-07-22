$hash = @{}

Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }

    $parts = $_ -split '=',2
    $hash[$parts[0].Trim()] = $parts[1].Trim()
}

$hash | ConvertTo-Json -Depth 5 | Set-Content secret_env.json