package xyz.outlinr.api.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import xyz.outlinr.api.config.ApplicationUrl;
import xyz.outlinr.api.service.RefreshTokenService;
import xyz.outlinr.api.dto.DefaultApiResponse;

@Slf4j
@RestController
@RequestMapping(ApplicationUrl.BASE_AUTH_URL)
@RequiredArgsConstructor
public class AuthController {
    private final RefreshTokenService refreshTokenService;

    @PostMapping(ApplicationUrl.REFRESH_TOKEN)
    public ResponseEntity<DefaultApiResponse<?>> refreshToken(HttpServletRequest request) {
        log.info("Processing refresh token request from IP: {}", request.getRemoteAddr());
        return refreshTokenService.refreshToken(request.getCookies());
    }

    @PostMapping(ApplicationUrl.LOGOUT)
    public ResponseEntity<DefaultApiResponse<?>> logout(HttpServletRequest request, HttpServletResponse response) {
        log.info("Processing logout request from IP: {}", request.getRemoteAddr());
        return refreshTokenService.revokeToken(request.getCookies(), response);
    }
}
