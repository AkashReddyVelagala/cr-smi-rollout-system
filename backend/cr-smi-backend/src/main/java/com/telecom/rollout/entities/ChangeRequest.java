package com.telecom.rollout.entities;

import com.telecom.rollout.enums.RolloutEnums;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "change_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChangeRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "cr_number", nullable = false, unique = true, length = 32)
    private String crNumber;

    @Column(nullable = false)
    private String title;

    @Column(name = "owner_name", nullable = false, length = 120)
    private String ownerName;

    @Column(name = "scheduled_date", nullable = false)
    private LocalDate scheduledDate;

    @Column(name = "window_start", nullable = false)
    private Instant windowStart;

    @Column(name = "window_end", nullable = false)
    private Instant windowEnd;

    @Enumerated(EnumType.STRING)
    @Column(name = "execution_mode", nullable = false, length = 32)
    private RolloutEnums.ExecutionMode executionMode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private RolloutEnums.CrStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() { createdAt = updatedAt = Instant.now(); }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
