package xyz.outlinr.api.dto.deploy;

import lombok.Data;

@Data
public class RepoValidationResponse {
    private Boolean hasDockerFile;
}
