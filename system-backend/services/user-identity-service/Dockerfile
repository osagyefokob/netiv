FROM eclipse-temurin:21-jdk-alpine AS build
RUN apk add --no-cache maven

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

RUN mvn dependency:go-offline -B || true

COPY . .

RUN mvn package -pl services/user-identity-service -am -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/services/user-identity-service/target/*.jar app.jar
EXPOSE 8081

ENTRYPOINT ["java", "-jar", "app.jar"]
