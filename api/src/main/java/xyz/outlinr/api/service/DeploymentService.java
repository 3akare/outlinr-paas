package xyz.outlinr.api.service;

import xyz.outlinr.api.dto.deploy.DeployRequest;
import xyz.outlinr.api.dto.deploy.DeploymentStatusResponse;
import xyz.outlinr.api.dto.deploy.NameAvailabilityResponse;
import xyz.outlinr.api.dto.deploy.RepoValidationResponse;

import java.util.UUID;

public interface DeploymentService {
    UUID deploy(DeployRequest deployRequest, UUID userId);
    NameAvailabilityResponse checkName(String name);
    RepoValidationResponse validateRepo(String repoFullName, UUID userId);
    DeploymentStatusResponse getDeploymentStatus(UUID deploymentId);
}
