package xyz.outlinr.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserDto {
    private Long id;
    private String name;
    private String email;
    private String avatarUrl;
    @JsonProperty("hasGithubInstallation")
    private boolean hasGithubInstallation;
}
