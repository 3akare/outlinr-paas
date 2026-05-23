package xyz.outlinr.api.service;

import xyz.outlinr.api.dto.UserDto;

public interface UserService {
    UserDto getUserProfile(String userId);
}
