package xyz.outlinr.api.controller;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import xyz.outlinr.api.entity.RefreshToken;
import xyz.outlinr.api.repository.RefreshTokenRepository;
import xyz.outlinr.api.security.JwtProvider;

import java.time.Instant;
import java.util.Arrays;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProvider jwtProvider;

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request) {
        if (request.getCookies() == null)
            return ResponseEntity.status((HttpStatus.UNAUTHORIZED)).body("Missing refresh cookie");

        String token = Arrays.stream(request.getCookies())
            .filter(cookie -> "refresh_token".equals(cookie.getName()))
            .map(Cookie::getValue)
            .findFirst()
            .orElse(null);

        if (token == null)
            return ResponseEntity.status((HttpStatus.UNAUTHORIZED)).body("Missing refresh cookie");
        RefreshToken refreshToken = refreshTokenRepository.findByToken(token).orElse(null);
        if (refreshToken == null || refreshToken.getExpiryDate().isBefore(Instant.now())) {
            if (refreshToken != null)
                refreshTokenRepository.delete(refreshToken);
            return ResponseEntity.status((HttpStatus.UNAUTHORIZED)).body("Invalid or expired refresh token");
        }

        String newAccessToken = jwtProvider.generateAccessToken(String.valueOf(refreshToken.getUser().getId()));
        return ResponseEntity.ok(Map.of("accessToken", newAccessToken));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        if (request.getCookies() != null) {
            Arrays.stream(request.getCookies())
                .filter(cookie -> "refresh_token".equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .flatMap(refreshTokenRepository::findByToken)
                .ifPresent(refreshTokenRepository::delete);
        }
        Cookie cookie = new Cookie("refresh_token", null);
        cookie.setPath("/api/auth/refresh");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        return ResponseEntity.ok("Logged out");
    }
}
