package xyz.outlinr.api.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import xyz.outlinr.api.entity.App;

import java.util.UUID;

@Repository
public interface AppRepository extends JpaRepository<App, UUID> {
    Boolean existsByName(String name);
}
