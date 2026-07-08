FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

COPY pom.xml .
COPY logistics-security-common/pom.xml logistics-security-common/
COPY services/user-identity-service/pom.xml services/user-identity-service/
COPY services/inventory-service/pom.xml services/inventory-service/
COPY services/warehouse-service/pom.xml services/warehouse-service/
COPY services/order-management-service/pom.xml services/order-management-service/
COPY services/procurement-service/pom.xml services/procurement-service/
COPY services/notification-service/pom.xml services/notification-service/
COPY services/reporting-service/pom.xml services/reporting-service/

RUN mvn dependency:go-offline -B

COPY . .

RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
RUN apk add --no-cache bash

COPY --from=build /app/services/*/target/*.jar /app/services/

COPY infrastructure/railway/start-services.sh /app/start-services.sh
RUN chmod +x /app/start-services.sh

CMD ["/app/start-services.sh"]
