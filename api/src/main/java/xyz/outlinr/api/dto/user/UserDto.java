package xyz.outlinr.api.dto.user;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

import java.util.UUID;

@Data
@Builder
public class UserDto {
    private UUID id;
    private String name;
    private String email;
    private String avatarUrl;
    @JsonProperty("hasGithubInstallation")
    private boolean hasGithubInstallation;
}
