param(
  [string]$BaseUrl = $(if ($env:API_BASE_URL) { $env:API_BASE_URL } else { "http://localhost:3000" })
)

$ErrorActionPreference = "Stop"
$BaseUrl = $BaseUrl.TrimEnd("/")
$itemId = $null
$testName = "API test $(Get-Date -Format 'yyyyMMddHHmmss')-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
$passed = 0

function Assert-Equal {
  param(
    [string]$Name,
    [object]$Actual,
    [object]$Expected
  )

  if ($Actual -ne $Expected) {
    throw "$Name failed. Expected '$Expected', received '$Actual'."
  }

  $script:passed++
  Write-Host "PASS $Name" -ForegroundColor Green
}

try {
  try {
    $health = Invoke-RestMethod "$BaseUrl/api/health" -TimeoutSec 10
  } catch {
    throw "Cannot reach the API at $BaseUrl. Start the backend first (cd server; npm run dev). $($_.Exception.Message)"
  }

  Assert-Equal "Health endpoint" $health.ok $true
  Assert-Equal "Health reports MySQL" $health.db "mysql"

  $before = @(Invoke-RestMethod "$BaseUrl/api/items" -TimeoutSec 10)
  Assert-Equal "List items endpoint returns an array" ($before -is [array]) $true

  $created = Invoke-RestMethod "$BaseUrl/api/items" `
    -Method Post `
    -ContentType "application/json" `
    -Body (@{ name = "  $testName  " } | ConvertTo-Json) `
    -TimeoutSec 10
  $itemId = $created.id

  Assert-Equal "Create returns a positive item ID" ($created.id -gt 0) $true
  Assert-Equal "Create trims item names" $created.name $testName
  Assert-Equal "New item starts unchecked" $created.status "not_picked_up"

  $listed = @(Invoke-RestMethod "$BaseUrl/api/items" -TimeoutSec 10)
  $listedItem = $listed | Where-Object { $_.id -eq $itemId } | Select-Object -First 1
  Assert-Equal "Created item appears in list" ($null -ne $listedItem) $true

  $checked = Invoke-RestMethod "$BaseUrl/api/items/$itemId" `
    -Method Patch `
    -ContentType "application/json" `
    -Body (@{ status = "picked_up" } | ConvertTo-Json) `
    -TimeoutSec 10
  Assert-Equal "Check item endpoint" $checked.status "picked_up"

  $unchecked = Invoke-RestMethod "$BaseUrl/api/items/$itemId" `
    -Method Patch `
    -ContentType "application/json" `
    -Body (@{ status = "not_picked_up" } | ConvertTo-Json) `
    -TimeoutSec 10
  Assert-Equal "Uncheck item endpoint" $unchecked.status "not_picked_up"

  $deleted = Invoke-WebRequest "$BaseUrl/api/items/$itemId" `
    -Method Delete `
    -UseBasicParsing `
    -TimeoutSec 10
  Assert-Equal "Delete item endpoint" $deleted.StatusCode 204
  $itemId = $null

  $afterDelete = @(Invoke-RestMethod "$BaseUrl/api/items" -TimeoutSec 10)
  $remaining = $afterDelete | Where-Object { $_.id -eq $created.id } | Select-Object -First 1
  Assert-Equal "Deleted item is absent from list" ($null -eq $remaining) $true

  Write-Host "`nAll $passed API checks passed." -ForegroundColor Green
} finally {
  if ($null -ne $itemId) {
    try {
      Invoke-WebRequest "$BaseUrl/api/items/$itemId" `
        -Method Delete `
        -UseBasicParsing `
        -TimeoutSec 10 | Out-Null
    } catch {
      Write-Warning "Could not clean up temporary test item $itemId`: $($_.Exception.Message)"
    }
  }
}
