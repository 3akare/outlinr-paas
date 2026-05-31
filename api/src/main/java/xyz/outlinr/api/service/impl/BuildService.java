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
    private static final String IMAGES_DIR = "/tmp/images";
    private static final String QUEUE_KEY = "build_queue";

    private final DeploymentRepository deploymentRepository;
    private final RedisTemplate<String, String> redisTemplate;
    private final GitService gitService;
    private final ObjectMapper objectMapper;
    private final RuntimeService runtimeService;

    private volatile boolean running = true;
    private Thread workerThread;

    @Value("${outlinr.buildkit.address}")
    private String buildKitAddr;

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
        Path imageTarPath = Path.of(IMAGES_DIR, deploymentId + ".tar");

        Deployment deployment = deploymentRepository.findWithAppById(deploymentId)
                .orElseThrow(() -> new RuntimeException("Deployment not found for id: " + deploymentId));

        try {
            String commitSha = gitService.getHeadCommitSha(workspacePath);
            deployment.setCommitSha(commitSha);
            deploymentRepository.save(deployment);
            log.info("Commit SHA extracted for deploymentId={}. commitSha={}", deploymentId, commitSha);

            String imageTag = "outlinr/" + payload.getAppId() + ":" + commitSha;

            deployment.setStatus(DeploymentStatus.BUILDING.name());
            deploymentRepository.save(deployment);

            runBuildKit(workspacePath, imageTarPath, imageTag, deploymentId);

            gitService.deleteWorkspace(deploymentId);
            log.info("Workspace deleted for deploymentId={}", deploymentId);

            runtimeService.run(deployment, imageTarPath, imageTag, payload);

            log.info("Build complete for deploymentId={}. imageTag={} tarPath={}", deploymentId, imageTag, imageTarPath);
        } catch (Exception e) {
            log.error("Build failed for deploymentId={}: {}", deploymentId, e.getMessage(), e);
            deployment.setStatus(DeploymentStatus.FAILED.name());
            deployment.setErrorMessage(e.getMessage());
            deploymentRepository.save(deployment);
            gitService.deleteWorkspace(deploymentId);
            deleteDirQuietly(imageTarPath);
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
                log.info("Auto-generated .dockerignore for deploymentId workspace: {}", workspacePath);
            } catch (IOException e) {
                log.warn("Failed to create .dockerignore file: {}", e.getMessage());
            }
        }
    }

    private void runBuildKit(Path workspacePath, Path imageTarPath, String imageTag, UUID deploymentId) throws Exception {
        ensureDockerIgnore(workspacePath);
        Files.createDirectories(imageTarPath.getParent());
        ProcessBuilder pb = new ProcessBuilder(
            "buildctl",
            "--addr", buildKitAddr,
            "build",
            "--frontend", "dockerfile.v0",
            "--local", "context=" + workspacePath.toAbsolutePath(),
            "--local", "dockerfile=" + workspacePath.toAbsolutePath(),
            "--output", "type=docker,name=" + imageTag + ",dest=" + imageTarPath.toAbsolutePath(),
            "--opt", "filename=Dockerfile"
        );
        pb.redirectErrorStream(true);
        log.info("Starting BuildKit for deploymentId={} imageTag={}", deploymentId, imageTag);

        Process process = pb.start();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                log.info("[buildKit][{}] {}", deploymentId, line);
            }
        }

        boolean finished = process.waitFor(20, TimeUnit.MINUTES);
        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException(
                    "BuildKit timed out (20 min limit) for deploymentId: " + deploymentId);
        }
        int exitCode = process.exitValue();
        if (exitCode != 0) {
            throw new RuntimeException(
                    "BuildKit exited with code " + exitCode + " for deploymentId: " + deploymentId);
        }
        log.info("BuildKit export complete for deploymentId={}. tar={}", deploymentId, imageTarPath);
    }

    private void deleteDirQuietly(Path path) {
        try {
            if (Files.exists(path)) {
                try (var stream = Files.walk(path)) {
                    stream.sorted(java.util.Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(java.io.File::delete);
                }
                log.info("Cleaned up path: {}", path);
            }
        } catch (IOException e) {
            log.warn("Could not delete path {}: {}", path, e.getMessage());
        }
    }
}