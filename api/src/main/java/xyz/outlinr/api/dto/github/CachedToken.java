package xyz.outlinr.api.dto.github;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CachedToken {
    private String token;
    private Instant expiresAt;
}
