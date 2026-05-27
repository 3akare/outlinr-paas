package xyz.outlinr.api.dto.deploy;

import lombok.Data;

import java.util.List;

@Data
public class DeployRequest {
    private String name;
    private String repoFullName;
    private String branch;
    private Integer appPort;
    private List<EnvironmentVars> environmentVars;

    @Data
    public static class EnvironmentVars {
        private String key;
        private String value;
    }
}
