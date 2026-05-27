package xyz.outlinr.api.service;

import xyz.outlinr.api.dto.user.UserDto;

import java.util.UUID;

public interface UserService {
    UserDto getUserProfile(UUID userId);
}
