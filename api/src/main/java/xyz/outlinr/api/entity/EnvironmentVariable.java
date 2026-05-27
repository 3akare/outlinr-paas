package xyz.outlinr.api.entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Entity
@Table(name = "environment_variables", indexes = {
    @Index(name = "idx_env_vars_app_id", columnList = "app_id")
})
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EnvironmentVariable {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String key;

    @Column(nullable = false)
    private String value;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "app_id", nullable = false, referencedColumnName = "id")
    private App app;
}
