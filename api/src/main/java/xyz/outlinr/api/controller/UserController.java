package xyz.outlinr.api.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import xyz.outlinr.api.config.ApplicationUrl;
import xyz.outlinr.api.dto.DefaultApiResponse;
import xyz.outlinr.api.dto.user.UserDto;
import xyz.outlinr.api.service.UserService;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping(ApplicationUrl.BASE_USER_URL)
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @GetMapping(ApplicationUrl.USER_PROFILE)
    public ResponseEntity<DefaultApiResponse<UserDto>> getUserProfile(@AuthenticationPrincipal UUID userId) {
        log.info("Inside UserController.getUserProfile. userId: {}", userId);
        return ResponseEntity.ok(DefaultApiResponse.success(userService.getUserProfile(userId)));
    }
}
