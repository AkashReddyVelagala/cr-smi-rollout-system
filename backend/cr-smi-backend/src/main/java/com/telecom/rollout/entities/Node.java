package com.telecom.rollout.entities;

import com.telecom.rollout.enums.RolloutEnums;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "nodes")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Node {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "rack_id", nullable = false)
    private Rack rack;

    @Column(name = "node_name", nullable = false, unique = true, length = 120)
    private String nodeName;

    @Enumerated(EnumType.STRING)
    @Column(name = "node_type", nullable = false, length = 32)
    private RolloutEnums.NodeType nodeType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RolloutEnums.Platform platform;

    @Column(name = "current_version", nullable = false, length = 64)
    private String currentVersion;

    @Column(name = "target_version", length = 64)
    private String targetVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}