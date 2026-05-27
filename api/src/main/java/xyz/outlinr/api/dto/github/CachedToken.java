package xyz.outlinr.api.dto.github;

import lombok.Data;
import java.time.Instant;

@Data
public class CachedToken {
    private String token;
    private Instant expiresAt;
}
