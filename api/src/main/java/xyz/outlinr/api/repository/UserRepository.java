package xyz.outlinr.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import xyz.outlinr.api.entity.User;

import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByGithubId(String githubId);
}
