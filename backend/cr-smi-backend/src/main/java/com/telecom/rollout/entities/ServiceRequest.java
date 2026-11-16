package com.telecom.rollout.entities;

import com.telecom.rollout.enums.RolloutEnums;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "service_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ServiceRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "sr_number", nullable = false, unique = true, length = 32)
    private String srNumber;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cr_id", nullable = false)
    private ChangeRequest changeRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "node_id", nullable = false)
    private Node node;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 8)
    private RolloutEnums.SrSeverity severity;

    @Column(nullable = false, length = 500)
    private String summary;

    @Column(name = "exit_code", length = 64)
    private String exitCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RolloutEnums.SrStatus status;

    @Column(name = "assigned_engineer", nullable = false, length = 120)
    private String assignedEngineer;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
