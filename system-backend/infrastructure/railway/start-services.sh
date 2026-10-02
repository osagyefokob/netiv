#!/bin/bash
set -e

JAVA_OPTS="-Xms64m -Xmx160m"

echo "Starting nginx..."
nginx

echo "Starting user-identity-service..."
java $JAVA_OPTS -jar /app/services/user-identity-service-*.jar &

echo "Identity service started."

wait
