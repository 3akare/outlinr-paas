package xyz.outlinr.api.service;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import xyz.outlinr.api.dto.DefaultApiResponse;

public interface RefreshTokenService {
    ResponseEntity<DefaultApiResponse<?>> refreshToken(Cookie[] cookies);
    ResponseEntity<DefaultApiResponse<?>> revokeToken(Cookie[] cookies, HttpServletResponse response);
}
