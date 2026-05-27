package xyz.outlinr.api.dto.deploy;

import lombok.Data;

import java.util.UUID;

@Data
public class DeploymentStatusResponse {
    private UUID deploymentId;
    private String status;
}
