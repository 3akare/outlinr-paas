package xyz.outlinr.api.service;

import xyz.outlinr.api.dto.GithubRepositoryDto;

import java.util.List;

public interface GithubAppService {
    void saveInstallationId(String githubId, String githubInstallationId);
    List<GithubRepositoryDto> getInstalledRepos(String githubId);
}
