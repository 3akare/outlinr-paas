package xyz.outlinr.api.service;

import xyz.outlinr.api.dto.GithubRepositoryDto;

import java.util.List;
import java.util.UUID;

public interface GithubAppService {
    void saveInstallationId(UUID userId, String githubInstallationId);
    List<GithubRepositoryDto> getInstalledRepos(UUID userId);
}
