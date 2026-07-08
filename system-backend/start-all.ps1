docker-compose -f infrastructure/docker/docker-compose.yml up -d

Start-Sleep -Seconds 10

$services = @(
  "user-identity-service",
  "inventory-service",
  "warehouse-service",
  "order-management-service",
  "procurement-service",
  "notification-service",
  "reporting-service"
)

foreach ($service in $services) {
    Start-Process powershell -ArgumentList "cd system-backend/services/$service; mvn spring-boot:run -Dspring-boot.run.profiles=local"
}