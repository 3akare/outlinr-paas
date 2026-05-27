FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn package -DskipTests -B

RUN java -Djarmode=layertools -jar target/*.jar extract --destination target/extracted

FROM moby/buildkit:latest AS buildkit-bin

FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=buildkit-bin /usr/bin/buildctl /usr/bin/buildctl

COPY --from=builder /app/target/extracted/dependencies/ ./
COPY --from=builder /app/target/extracted/spring-boot-loader/ ./
COPY --from=builder /app/target/extracted/snapshot-dependencies/ ./
COPY --from=builder /app/target/extracted/application/ ./

EXPOSE 8080
ENTRYPOINT ["java", "-Xms256m", "-Xmx256m", "org.springframework.boot.loader.launch.JarLauncher"]