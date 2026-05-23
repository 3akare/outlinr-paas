package xyz.outlinr.api.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import xyz.outlinr.api.dto.UserDto;
import xyz.outlinr.api.entity.User;
import xyz.outlinr.api.repository.UserRepository;
import xyz.outlinr.api.service.UserService;

@Slf4j
@Service
@RequiredArgsConstructor
public class IUserService implements UserService {
    private final UserRepository userRepository;

    @Override
    public UserDto getUserProfile(String userId) {
        log.info("Fetching user profile for user: {}", userId);
        User user = userRepository.findById(Long.valueOf(userId))
                .orElseThrow(() -> new RuntimeException("User not found"));

        return UserDto.builder()
            .id(user.getId())
            .name(user.getName())
            .email(user.getEmail())
            .avatarUrl(user.getAvatarUrl())
            .hasGithubInstallation(user.getGithubInstallationId() != null && !user.getGithubInstallationId().isEmpty())
            .build();
    }
}
