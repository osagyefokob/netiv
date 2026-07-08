#!/bin/bash
set -e

JAVA_OPTS="-Xms256m -Xmx512m"

echo "Starting user-identity-service..."
java $JAVA_OPTS -jar /app/services/user-identity-service-*.jar &
PIDS="$!"

echo "Starting inventory-service..."
java $JAVA_OPTS -jar /app/services/inventory-service-*.jar &
PIDS="$PIDS $!"

echo "Starting warehouse-service..."
java $JAVA_OPTS -jar /app/services/warehouse-service-*.jar &
PIDS="$PIDS $!"

echo "Starting order-management-service..."
java $JAVA_OPTS -jar /app/services/order-management-service-*.jar &
PIDS="$PIDS $!"

echo "Starting procurement-service..."
java $JAVA_OPTS -jar /app/services/procurement-service-*.jar &
PIDS="$PIDS $!"

echo "Starting notification-service..."
java $JAVA_OPTS -jar /app/services/notification-service-*.jar &
PIDS="$PIDS $!"

echo "Starting reporting-service..."
java $JAVA_OPTS -jar /app/services/reporting-service-*.jar &
PIDS="$PIDS $!"

echo "All services started. PIDs: $PIDS"

wait $PIDS
