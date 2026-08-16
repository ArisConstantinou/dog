$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

$secureKey = Read-Host "Paste your Meshy API key" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)

    if ([string]::IsNullOrWhiteSpace($key) -or -not $key.StartsWith("msy_")) {
        Write-Host "Invalid key. A Meshy API key must start with msy_" -ForegroundColor Red
        exit 2
    }

    $envPath = Join-Path $PSScriptRoot ".env"
    $utf8WithoutBom = New-Object System.Text.UTF8Encoding($false)
    [IO.File]::WriteAllText(
        $envPath,
        "MESHY_API_KEY=$key$([Environment]::NewLine)",
        $utf8WithoutBom
    )

    Write-Host "Meshy key saved successfully to .env." -ForegroundColor Green
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $key = $null
    $secureKey.Dispose()
}
