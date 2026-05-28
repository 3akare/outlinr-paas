package xyz.outlinr.api.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.errors.GitAPIException;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.eclipse.jgit.transport.UsernamePasswordCredentialsProvider;
import org.springframework.stereotype.Service;
import xyz.outlinr.api.service.GitService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@Slf4j
@Service
public class GitServiceImpl implements GitService {
    private static final String BUILD_WORKSPACE = "/tmp/builds";

    @Override
    public Path cloneRepository(String repoFullName, String branch, String installationToken, UUID deploymentId) {
        Path clonePath = Path.of(BUILD_WORKSPACE, deploymentId.toString());
        String cloneUrl = "https://github.com/" + repoFullName + ".git";
        try {
            Git.cloneRepository()
                .setURI(cloneUrl)
                .setDirectory(clonePath.toFile())
                .setBranch(branch)
                .setCredentialsProvider(
                        new UsernamePasswordCredentialsProvider("x-access-token", installationToken)
                ).call();
            return clonePath;
        } catch (GitAPIException e) {
            log.error("Clone failed for {}: {}", repoFullName, e.getMessage());
            deleteQuietly(clonePath);
            throw new RuntimeException("Failed to clone repository: " + repoFullName);
        }
    }

    @Override
    public Boolean hasDockerfile(Path path) {
        return Files.exists(path.resolve("Dockerfile")) || Files.exists(path.resolve("dockerfile"));
    }

    @Override
    public void deleteWorkspace(UUID deploymentId) {
        Path target = Path.of(BUILD_WORKSPACE, deploymentId.toString());
        deleteQuietly(target);
        log.info("Deleted build workspace for deploymentId: {}", deploymentId);
    }

    @Override
    public String getHeadCommitSha(Path clonePath) {
        try {
            Repository repository = new FileRepositoryBuilder()
                .setGitDir(clonePath.resolve(".git").toFile())
                .build();

            ObjectId head = repository.resolve("HEAD");
            if (head == null) {
                throw new RuntimeException("Could not resolve HEAD in cloned repo at: " + clonePath);
            }
            return head.getName();
        } catch (Exception e) {
            throw new RuntimeException("Failed to read HEAD commit SHA from: " + clonePath, e);
        }
    }

    private void deleteQuietly(Path path) {
        try {
            if (Files.exists(path)) {
                try (var stream = Files.walk(path)) {
                    stream.sorted(java.util.Comparator.reverseOrder())
                        .map(Path::toFile)
                        .forEach(java.io.File::delete);
                }
            }
        } catch (IOException e) {
            log.warn("Could not delete directory {}: {}", path, e.getMessage());
        }
    }
}
