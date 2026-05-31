package xyz.outlinr.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.outlinr.api.entity.Deployment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeploymentRepository extends JpaRepository<Deployment, UUID> {
    List<Deployment> findByStatus(String status);
    Optional<Deployment> findByAppIdAndStatusAndIdNot(UUID appId, String status, UUID excludeId);
}
