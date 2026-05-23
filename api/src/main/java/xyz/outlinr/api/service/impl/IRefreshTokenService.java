package xyz.outlinr.api.service.impl;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import xyz.outlinr.api.entity.RefreshToken;
import xyz.outlinr.api.repository.RefreshTokenRepository;
import xyz.outlinr.api.security.JwtProvider;
import xyz.outlinr.api.service.RefreshTokenService;
import xyz.outlinr.api.dto.DefaultApiResponse;

import java.time.Instant;
import java.util.Arrays;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class IRefreshTokenService implements RefreshTokenService {
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProvider jwtProvider;

    @Override
    public ResponseEntity<DefaultApiResponse<?>> refreshToken(Cookie[] cookies) {
        if (cookies == null) {
            log.warn("Refresh token request missing cookies");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(DefaultApiResponse.error("Missing refresh cookie"));
        }

        String token = Arrays.stream(cookies)
            .filter(cookie -> "refresh_token".equals(cookie.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);

        if (token == null) {
            log.warn("Refresh token request missing refresh_token cookie");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(DefaultApiResponse.error("Missing refresh cookie"));
        }

        RefreshToken refreshToken = refreshTokenRepository.findByToken(token).orElse(null);

        if (refreshToken == null) {
            log.warn("Refresh token not found in database for provided cookie");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(DefaultApiResponse.error("Invalid or expired refresh token"));
        }

        if (refreshToken.getExpiryDate().isBefore(Instant.now())) {
            log.warn("Refresh token expired for user: {}", refreshToken.getUser().getId());
            refreshTokenRepository.delete(refreshToken);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(DefaultApiResponse.error("Invalid or expired refresh token"));
        }

        String newAccessToken = jwtProvider.generateAccessToken(String.valueOf(refreshToken.getUser().getId()));
        log.info("Successfully refreshed access token for user: {}", refreshToken.getUser().getId());
        return ResponseEntity.ok(DefaultApiResponse.success(Map.of("accessToken", newAccessToken)));
    }

    @Override
    public ResponseEntity<DefaultApiResponse<?>> revokeToken(Cookie[] cookies, HttpServletResponse response) {
        if (cookies != null) {
            Arrays.stream(cookies)
                .filter(cookie -> "refresh_token".equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .flatMap(refreshTokenRepository::findByToken)
                .ifPresent(token -> {
                    log.info("Revoking refresh token for user: {}", token.getUser().getId());
                    refreshTokenRepository.delete(token);
                });
        }

        Cookie cookie = new Cookie("refresh_token", null);
        cookie.setPath("/api/auth/refresh");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setMaxAge(0);
        response.addCookie(cookie);

        return ResponseEntity.ok(DefaultApiResponse.success("Logged out"));
    }
}
