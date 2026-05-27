package xyz.outlinr.api.service;

import xyz.outlinr.api.dto.github.GithubRepositoryDto;

import java.util.List;
import java.util.UUID;

public interface GithubAppService {
    void saveInstallationId(UUID userId, String githubInstallationId);
    List<GithubRepositoryDto> getInstalledRepos(UUID userId);
    Boolean hasDockerFile(String repoFullName,String githubInstallationId);
    String getInstallationToken(String installationId);
}
