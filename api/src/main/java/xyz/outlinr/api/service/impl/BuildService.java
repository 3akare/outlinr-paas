package xyz.outlinr.api.service.impl;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import xyz.outlinr.api.dto.deploy.BuildJobPayload;
import xyz.outlinr.api.dto.enums.DeploymentStatus;
import xyz.outlinr.api.entity.Deployment;
import xyz.outlinr.api.repository.DeploymentRepository;
import xyz.outlinr.api.service.GitService;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.file.Path;
import java.time.Duration;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BuildService {
    private static final String BUILD_WORKSPACE = "/tmp/builds";
    private static final String QUEUE_KEY = "build_queue";

    private final DeploymentRepository deploymentRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final GitService gitService;
    private final ObjectMapper objectMapper;

    @Value("${outlinr.buildkit.address}")
    private String buildKitAddr;

    @Value("${outlinr.docker.hub.username}")
    private String dockerHubUsername;

    @Value("${outlinr.docker.hub.password}")
    private String dockerHubPassword;

    @PostConstruct
    public void startWorker() {
        Thread worker = new Thread(this::runLoop, "build-worker");
        worker.setDaemon(true);
        worker.start();
        log.info("Build worker started, waiting for jobs on queue: {}", QUEUE_KEY);
    }

    public void runLoop() {
        while (true) {
            try {
                var result = redisTemplate.opsForList().rightPop(QUEUE_KEY, Duration.ofSeconds(0));
                if (result != null) {
                    BuildJobPayload payload = objectMapper.readValue(result, BuildJobPayload.class);
                    log.info("Picked up build job from queue. deploymentId: {}", payload.getDeploymentId());
                    processBuildJob(payload);
                }
            } catch (Exception e) {
                log.error("Error processing build job: {}", e.getMessage());
            }
        }
    }

    private void processBuildJob(BuildJobPayload payload) {
        UUID deploymentId = payload.getDeploymentId();
        Path workspacePath = Path.of(BUILD_WORKSPACE, deploymentId.toString());

        Deployment deployment = deploymentRepository.findById(deploymentId).orElseThrow(() -> new RuntimeException("Deployment not found for id: " + deploymentId));

        try {
            String commitSha = gitService.getHeadCommitSha(workspacePath);
            deployment.setCommitSha(commitSha);
            deploymentRepository.save(deployment);
            log.info("Build started for deploymentId={}. commitSha={}", deploymentId, commitSha);

            deployment.setStatus(DeploymentStatus.BUILDING.name());
            deploymentRepository.save(deployment);

            String imageTag = dockerHubUsername + "/" + payload.getAppId() + ":" + commitSha;
            runBuildKit(workspacePath, imageTag, deploymentId);

            gitService.deleteWorkspace(deploymentId);
            log.info("Build completed for deploymentId={}. imageTag={}", deploymentId, imageTag);
        } catch (Exception e) {
            log.error("Build failed for deploymentId={}: {}", deploymentId, e.getMessage(), e);
            deployment.setStatus(DeploymentStatus.FAILED.name());
            deployment.setErrorMessage(e.getMessage());
            deploymentRepository.save(deployment);
            gitService.deleteWorkspace(deploymentId);
        }
    }

    private void runBuildKit(Path workspacePath, String imageTag, UUID deploymentId) throws Exception{
        String authConfig = buildDockerAuthConfig();
        ProcessBuilder pb = new ProcessBuilder(
            "buildctl",
            "--addr", buildKitAddr,
            "build",
            "--frontend", "dockerfile.v0",
            "--local", "context=" + workspacePath.toAbsolutePath(),
            "--local", "dockerfile=" + workspacePath.toAbsolutePath(),
            "--output", "type=image,name=" + imageTag + ",push=true",
            "--opt", "filename=Dockerfile"
        );

        pb.environment().put("DOCKER_CONFIG", writeTempDockerConfig(authConfig));
        pb.redirectErrorStream(true);
        log.info("Starting build for deploymentId={} with imageTag={}", deploymentId, imageTag);

        Deployment deployment = deploymentRepository.findById(deploymentId).orElseThrow(() -> new RuntimeException("Deployment not found for id: " + deploymentId));
        Process process = pb.start();

        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            boolean pushStarted = false;
            while ((line = reader.readLine()) != null) {
                log.info("[buildKit][{}] {}", deploymentId, line);
                if (!pushStarted && line.toLowerCase().contains("pushing")) {
                    pushStarted = true;
                    deployment.setStatus(DeploymentStatus.PUSHING.name());
                    deploymentRepository.save(deployment);
                }
            }
        }
        int exitCode = process.waitFor();
        if (exitCode != 0) {
            throw new RuntimeException("BuildKit exited with code " + exitCode + " for image: " + imageTag);
        }
        log.info("BuildKit finished successfully for deploymentId={}", deploymentId);
    }

    private String writeTempDockerConfig(String authJson) throws Exception {
        Path configDir = Path.of("/tmp/docker-config-" + UUID.randomUUID());
        java.nio.file.Files.createDirectories(configDir);
        java.nio.file.Files.writeString(configDir.resolve("config.json"), authJson);
        return configDir.toAbsolutePath().toString();
    }

    private String buildDockerAuthConfig() {
        String credentials = dockerHubUsername + ":" + dockerHubPassword;
        String encoded = java.util.Base64.getEncoder()
                .encodeToString(credentials.getBytes());
        return """
            {
              "auths": {
                "https://index.docker.io/v1/": {
                  "auth": "%s"
                }
              }
            }
            """.formatted(encoded);
    }
}
