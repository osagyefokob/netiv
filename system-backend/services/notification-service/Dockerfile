FROM eclipse-temurin:21-jdk-alpine AS build
RUN apk add --no-cache maven

WORKDIR /app

COPY pom.xml .
COPY logistics-security-common/pom.xml logistics-security-common/
COPY services/notification-service/pom.xml services/notification-service/

RUN mvn dependency:go-offline -B || true

COPY . .

RUN mvn package -pl services/notification-service -am -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/services/notification-service/target/*.jar app.jar
EXPOSE 8086

ENTRYPOINT ["java", "-jar", "app.jar"]
