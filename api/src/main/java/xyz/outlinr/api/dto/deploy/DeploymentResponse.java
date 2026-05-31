package xyz.outlinr.api.dto.deploy;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DeploymentResponse {
    private UUID id;
    private String appName;
    private String repoFullName;
    private String branch;
    private Integer appPort;
    private String status;
    private String commitSha;
    private String errorMessage;
    private Instant createdAt;
}
