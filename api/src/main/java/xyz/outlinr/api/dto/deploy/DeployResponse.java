package xyz.outlinr.api.dto.deploy;

import lombok.Data;

import java.util.UUID;

@Data
public class DeployResponse {
    private UUID deploymentId;
}
