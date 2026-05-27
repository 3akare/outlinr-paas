package xyz.outlinr.api.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtProvider jwtProvider;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response, @NonNull FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                if (jwtProvider.validateToken(token)) {
                    String subject = jwtProvider.getUserIdFromToken(token);
                    UUID userId = null;
                    if (subject != null) {
                        try {
                            userId = UUID.fromString(subject);
                        } catch (IllegalArgumentException e) {
                            // Flawless migration conversion: if legacy subject is a Long ID, convert to synthetic UUID
                            if (subject.matches("\\d+")) {
                                long legacyId = Long.parseLong(subject);
                                userId = new UUID(0L, legacyId);
                                log.warn("Migrated legacy Long ID {} to synthetic UUID {}", legacyId, userId);
                            } else {
                                log.error("Malformed subject in JWT token: {}", subject);
                            }
                        }
                    }
                    if (userId != null) {
                        SecurityContextHolder.getContext().setAuthentication(
                                new UsernamePasswordAuthenticationToken(userId, null, Collections.emptyList()));
                    }
                }
            } catch (Exception e) {
                log.error("Failed to authenticate JWT token: {}", e.getMessage());
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }
}
