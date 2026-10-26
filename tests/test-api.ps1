param(
  [string]$BaseUrl = $env:API_BASE_URL
)

$ErrorActionPreference = "Stop"
$itemId = $null
$testName = "API test $(Get-Date -Format 'yyyyMMddHHmmss')-$([guid]::NewGuid().ToString('N').Substring(0, 8))"
$passed = 0
$apiMode = $null

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

function Get-ListItems {
  if ($script:apiMode -eq "fastapi") {
    $response = Invoke-RestMethod "$script:BaseUrl/api/lists/demo/items" -TimeoutSec 10
    return @($response.items)
  }

  return @(Invoke-RestMethod "$script:BaseUrl/api/items" -TimeoutSec 10)
}

if (-not $BaseUrl) {
  foreach ($candidate in @("http://localhost:8000", "http://localhost:3000")) {
    $BaseUrl = $candidate
    try {
      $health = Invoke-RestMethod "$BaseUrl/health" -TimeoutSec 3
      if ($health.database -eq "connected") {
        $apiMode = "fastapi"
        break
      }
    } catch {
      try {
        $health = Invoke-RestMethod "$BaseUrl/api/health" -TimeoutSec 3
        if ($health.db -eq "mysql") {
          $apiMode = "express"
          break
        }
      } catch {
        $apiMode = $null
      }
    }
  }
} else {
  $BaseUrl = $BaseUrl.TrimEnd("/")
  try {
    $health = Invoke-RestMethod "$BaseUrl/health" -TimeoutSec 10
    if ($health.database -eq "connected") {
      $apiMode = "fastapi"
    }
  } catch {
    try {
      $health = Invoke-RestMethod "$BaseUrl/api/health" -TimeoutSec 10
      if ($health.db -eq "mysql") {
        $apiMode = "express"
      }
    } catch {
      $apiMode = $null
    }
  }
}

if (-not $apiMode) {
  throw "Could not find a healthy API. Start FastAPI on port 8000 or Express on port 3000, then retry."
}

try {
  Assert-Equal "Health endpoint" $health.ok $true
  if ($apiMode -eq "fastapi") {
    Assert-Equal "Health reports connected database" $health.database "connected"
  } else {
    Assert-Equal "Health reports MySQL" $health.db "mysql"
  }

  $before = @(Get-ListItems)
  Assert-Equal "List items endpoint returns an array" ($before -is [array]) $true

  if ($apiMode -eq "fastapi") {
    $created = Invoke-RestMethod "$BaseUrl/api/lists/demo/items" `
      -Method Post `
      -ContentType "application/json" `
      -Body (@{ name = "  $testName  " } | ConvertTo-Json) `
      -TimeoutSec 10
  } else {
    $created = Invoke-RestMethod "$BaseUrl/api/items" `
      -Method Post `
      -ContentType "application/json" `
      -Body (@{ name = "  $testName  " } | ConvertTo-Json) `
      -TimeoutSec 10
  }
  $itemId = $created.id

  Assert-Equal "Create returns a positive item ID" ($created.id -gt 0) $true
  Assert-Equal "Create trims item names" $created.name $testName
  if ($apiMode -eq "fastapi") {
    Assert-Equal "New item starts unchecked" $created.checked $false
  } else {
    Assert-Equal "New item starts unchecked" $created.status "not_picked_up"
  }

  $listed = @(Get-ListItems)
  $listedItem = $listed | Where-Object { $_.id -eq $itemId } | Select-Object -First 1
  Assert-Equal "Created item appears in list" ($null -ne $listedItem) $true

  if ($apiMode -eq "fastapi") {
    $checked = Invoke-RestMethod "$BaseUrl/api/items/$itemId" `
      -Method Patch `
      -ContentType "application/json" `
      -Body (@{ checked = $true } | ConvertTo-Json) `
      -TimeoutSec 10
    Assert-Equal "Check item endpoint" $checked.checked $true

    $unchecked = Invoke-RestMethod "$BaseUrl/api/items/$itemId" `
      -Method Patch `
      -ContentType "application/json" `
      -Body (@{ checked = $false } | ConvertTo-Json) `
      -TimeoutSec 10
    Assert-Equal "Uncheck item endpoint" $unchecked.checked $false
  } else {
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
  }

  $deleted = Invoke-WebRequest "$BaseUrl/api/items/$itemId" `
    -Method Delete `
    -UseBasicParsing `
    -TimeoutSec 10
  Assert-Equal "Delete item endpoint" $deleted.StatusCode 204
  $itemId = $null

  $afterDelete = @(Get-ListItems)
  $remaining = $afterDelete | Where-Object { $_.id -eq $created.id } | Select-Object -First 1
  Assert-Equal "Deleted item is absent from list" ($null -eq $remaining) $true

  Write-Host "`nAll $passed API checks passed ($apiMode)." -ForegroundColor Green
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
