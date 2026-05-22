package xyz.outlinr.api.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;
import xyz.outlinr.api.entity.RefreshToken;
import xyz.outlinr.api.entity.User;
import xyz.outlinr.api.repository.RefreshTokenRepository;
import xyz.outlinr.api.repository.UserRepository;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    private final JwtProvider jwtProvider;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${outlinr.client.url}")
    private String clientUrl;

    @Transactional
    public void onAuthenticationSuccess(@NonNull HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        assert oAuth2User != null;
        Integer id = oAuth2User.getAttribute("id");
        String githubId = (id != null) ? String.valueOf(id) : null;
        String name = oAuth2User.getAttribute("name");
        String email = oAuth2User.getAttribute("email");
        String avatarUrl = oAuth2User.getAttribute("avatar_url");

        User user = userRepository.findByGithubId(githubId)
            .orElseGet(() -> userRepository.save(
                User.builder()
                    .githubId(githubId)
                    .name(name)
                    .email(email)
                    .avatarUrl(avatarUrl)
                    .build()
                ));
        String accessToken = jwtProvider.generateAccessToken(user.getId().toString());
        String refreshId = UUID.randomUUID().toString();
        RefreshToken refreshToken = refreshTokenRepository.findByUser(user)
            .orElseGet(() -> RefreshToken.builder().user(user).build());
        refreshToken.setToken(refreshId);
        refreshToken.setExpiryDate(Instant.now().plusSeconds(604800));
        refreshTokenRepository.save(refreshToken);
        Cookie cookie = new Cookie("refresh_token", refreshId);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/api/auth/refresh");
        cookie.setMaxAge(604800);
        response.addCookie(cookie);
        String callbackUrl = clientUrl + "/auth/callback";
        String targetUrl = UriComponentsBuilder.fromUriString(callbackUrl)
            .queryParam("access_token", accessToken)
            .build()
            .toUriString();
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
