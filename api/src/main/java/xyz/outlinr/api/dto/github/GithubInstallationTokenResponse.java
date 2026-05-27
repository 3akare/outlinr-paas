package xyz.outlinr.api.dto.github;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class GithubInstallationTokenResponse {
    private String token;
    @JsonProperty("expires_at")
    private String expiresAt;
}
