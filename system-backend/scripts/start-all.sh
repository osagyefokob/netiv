#!/bin/bash
cd infrastructure/docker && docker-compose up -d
sleep 10  # Wait for Kafka to be ready

SERVICES=(
  "user-identity-service"
  "inventory-service"
  "warehouse-service"
  "order-management-service"
  "procurement-service"
  "notification-service"
  "reporting-service"
)

for SERVICE in "${SERVICES[@]}"; do
  (
    cd "$(pwd)/services/$SERVICE" || exit
    mvn spring-boot:run -Dspring-boot.run.profiles=local
  ) &
done

wait