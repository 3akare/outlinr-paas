package xyz.outlinr.api.service;

import xyz.outlinr.api.dto.deploy.*;

import java.util.List;
import java.util.UUID;

public interface DeploymentService {
    UUID deploy(DeployRequest deployRequest, UUID userId);
    NameAvailabilityResponse checkName(String name);
    RepoValidationResponse validateRepo(String repoFullName, UUID userId);
    DeploymentStatusResponse getDeploymentStatus(UUID deploymentId);
    List<DeploymentResponse> listDeployments(UUID userId);
}
