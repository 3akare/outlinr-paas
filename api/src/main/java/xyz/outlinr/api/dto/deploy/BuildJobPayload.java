package xyz.outlinr.api.dto.deploy;

import lombok.Data;

import java.util.UUID;

@Data
public class BuildJobPayload {
    private UUID deploymentId;
    private UUID appId;
    private String repoFullName;
    private String branch;
    private String githubInstallationId;
    private Integer appPort;
}
