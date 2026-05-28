package xyz.outlinr.api.service.impl;

import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;
import xyz.outlinr.api.dto.deploy.BuildJobPayload;
import xyz.outlinr.api.dto.enums.DeploymentStatus;
import xyz.outlinr.api.entity.Deployment;
import xyz.outlinr.api.repository.DeploymentRepository;
import xyz.outlinr.api.service.GitService;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

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

    private volatile boolean running = true;
    private Thread workerThread;

    @Value("${outlinr.buildkit.address}")
    private String buildKitAddr;

    @Value("${outlinr.docker.hub.username}")
    private String dockerHubUsername;

    @Value("${outlinr.docker.hub.password}")
    private String dockerHubPassword;

    @EventListener(ApplicationReadyEvent.class)
    public void startWorker() {
        workerThread = new Thread(this::runLoop, "build-worker");
        workerThread.setDaemon(true);
        workerThread.start();
        log.info("Build worker started, waiting for jobs on queue: {}", QUEUE_KEY);
    }

    @PreDestroy
    public void stopWorker() {
        log.info("Stopping build worker thread...");
        running = false;
        if (workerThread != null) {
            workerThread.interrupt();
        }
    }

    public void runLoop() {
        while (running) {
            try {
                // Short poll timeout of 5 seconds to check the running state and shut down gracefully
                var result = redisTemplate.opsForList().rightPop(QUEUE_KEY, Duration.ofSeconds(5));
                if (result != null) {
                    BuildJobPayload payload = objectMapper.readValue(result, BuildJobPayload.class);
                    log.info("Picked up build job from queue. deploymentId: {}", payload.getDeploymentId());
                    processBuildJob(payload);
                }
            } catch (Exception e) {
                if (!running) {
                    log.info("Build worker shutting down cleanly.");
                    break;
                }
                log.error("Error processing build job: {}", e.getMessage());
            }
        }
    }

    private void processBuildJob(BuildJobPayload payload) {
        UUID deploymentId = payload.getDeploymentId();
        Path workspacePath = Path.of(BUILD_WORKSPACE, deploymentId.toString());

        Deployment deployment = deploymentRepository.findById(deploymentId)
                .orElseThrow(() -> new RuntimeException("Deployment not found for id: " + deploymentId));

        try {
            String commitSha = gitService.getHeadCommitSha(workspacePath);
            deployment.setCommitSha(commitSha);
            deploymentRepository.save(deployment);
            log.info("Build started for deploymentId={}. commitSha={}", deploymentId, commitSha);

            deployment.setStatus(DeploymentStatus.BUILDING.name());
            deploymentRepository.save(deployment);

            String imageTag = dockerHubUsername + "/" + payload.getAppId() + ":" + commitSha;
            runBuildKit(workspacePath, imageTag, deploymentId);

            // Transition state to ACTIVE on successful completion
            deployment.setStatus(DeploymentStatus.ACTIVE.name());
            deploymentRepository.save(deployment);

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

    private void ensureDockerIgnore(Path workspacePath) {
        Path dockerIgnorePath = workspacePath.resolve(".dockerignore");
        if (!Files.exists(dockerIgnorePath)) {
            try {
                String ignoreContent = """
                        .git
                        node_modules
                        target
                        .mvn
                        .idea
                        *.log
                        """;
                Files.writeString(dockerIgnorePath, ignoreContent);
                log.info("Auto-generated .dockerignore to optimize BuildKit context transfer speed.");
            } catch (IOException e) {
                log.warn("Failed to create .dockerignore file: {}", e.getMessage());
            }
        }
    }

    private void runBuildKit(Path workspacePath, String imageTag, UUID deploymentId) throws Exception {
        ensureDockerIgnore(workspacePath);

        String authConfig = buildDockerAuthConfig();
        String configDirStr = null;

        try {
            configDirStr = writeTempDockerConfig(authConfig);
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

            pb.environment().put("DOCKER_CONFIG", configDirStr);
            pb.redirectErrorStream(true);
            log.info("Starting build for deploymentId={} with imageTag={}", deploymentId, imageTag);

            Deployment deployment = deploymentRepository.findById(deploymentId)
                    .orElseThrow(() -> new RuntimeException("Deployment not found for id: " + deploymentId));
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

            // Implement strict execution watchdog: 20 minutes limit to prevent worker thread hang
            boolean finished = process.waitFor(20, TimeUnit.MINUTES);
            if (!finished) {
                process.destroyForcibly();
                throw new RuntimeException("BuildKit execution timed out (exceeded 20 minutes limit) for image: " + imageTag);
            }

            int exitCode = process.exitValue();
            if (exitCode != 0) {
                throw new RuntimeException("BuildKit exited with code " + exitCode + " for image: " + imageTag);
            }
            log.info("BuildKit finished successfully for deploymentId={}", deploymentId);
        } finally {
            if (configDirStr != null) {
                deleteDirQuietly(Path.of(configDirStr));
            }
        }
    }

    private void deleteDirQuietly(Path path) {
        try {
            if (Files.exists(path)) {
                try (var stream = Files.walk(path)) {
                    stream.sorted(java.util.Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(java.io.File::delete);
                }
                log.info("Cleaned up temporary Docker config directory: {}", path);
            }
        } catch (IOException e) {
            log.warn("Could not delete temporary directory {}: {}", path, e.getMessage());
        }
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
