package xyz.outlinr.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.outlinr.api.entity.EnvironmentVariable;

import java.util.List;
import java.util.UUID;

@Repository
public interface EnvironmentVariableRepository extends JpaRepository<EnvironmentVariable, UUID> {
    List<EnvironmentVariable> findByAppId(UUID appId);
    void deleteByAppId(UUID appId);
}
