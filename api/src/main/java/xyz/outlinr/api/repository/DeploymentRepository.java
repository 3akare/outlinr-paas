package xyz.outlinr.api.repository;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import xyz.outlinr.api.entity.Deployment;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface DeploymentRepository extends JpaRepository<Deployment, UUID> {
    List<Deployment> findByStatus(String status);
    Optional<Deployment> findByAppIdAndStatusAndIdNot(UUID appId, String status, UUID excludeId);

    @EntityGraph(attributePaths = {"app"})
    Optional<Deployment> findWithAppById(UUID id);

    @Query("SELECT d FROM Deployment d JOIN FETCH d.app a WHERE a.user.id = :userId ORDER BY d.createdAt DESC")
    List<Deployment> findByUserId(@Param("userId") UUID userId);
}
