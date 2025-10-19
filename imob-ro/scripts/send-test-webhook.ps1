# Script: send-test-webhook.ps1
# Usage: .\send-test-webhook.ps1 -url "http://localhost:3000/api/webhook" -event "checkout.session.completed"
param(
  [string]$url = "http://localhost:3000/api/webhook",
  [string]$event = "checkout.session.completed",
  [string]$customer = "cus_test_123",
  [string]$email = "test@example.com"
)

$payload = @{
  id = "evt_test_123"
  object = "event"
  type = $event
  data = @{
    object = @{
      id = "cs_test_123"
      object = "checkout.session"
      customer = $customer
      customer_email = $email
    }
  }
} | ConvertTo-Json -Depth 5

Write-Host "Sending test webhook to $url with event $event"

try {
  $resp = Invoke-RestMethod -Uri $url -Method Post -Body $payload -ContentType "application/json"
  Write-Host "Response:`n" ($resp | ConvertTo-Json -Depth 5)
} catch {
  Write-Error $_.Exception.Message
}
