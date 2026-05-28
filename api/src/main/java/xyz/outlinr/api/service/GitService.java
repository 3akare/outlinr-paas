package xyz.outlinr.api.service;

import java.nio.file.Path;
import java.util.UUID;

public interface GitService {
    Path cloneRepository(String repoFullName, String branch, String installationToken, UUID deploymentId);
    Boolean hasDockerfile(Path path);
    void deleteWorkspace(UUID deploymentId);
    String getHeadCommitSha(Path clonePath);
}
