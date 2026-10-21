if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Error "Node.js chưa được cài. Hãy cài Node.js rồi chạy lại script này."
  exit 1
}
node (Join-Path $PSScriptRoot "server.js")
