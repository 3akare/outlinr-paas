package xyz.outlinr.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.outlinr.api.entity.RefreshToken;
import xyz.outlinr.api.entity.User;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {
    Optional<RefreshToken> findByToken(String token);
    Optional<RefreshToken> findByUser(User user);
    void deleteByUser(User user);
}
