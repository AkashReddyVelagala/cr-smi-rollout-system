package com.telecom.rollout.entities;

import com.telecom.rollout.enums.RolloutEnums;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "cr_node_executions", uniqueConstraints = @UniqueConstraint(columnNames = {"cr_id", "node_id"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CrNodeExecution {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cr_id", nullable = false)
    private ChangeRequest changeRequest;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "node_id", nullable = false)
    private Node node;

    @Column(name = "from_version", nullable = false, length = 64)
    private String fromVersion;

    @Column(name = "to_version", nullable = false, length = 64)
    private String toVersion;

    @Enumerated(EnumType.STRING)
    @Column(name = "pre_check_status", nullable = false, length = 32)
    private RolloutEnums.CheckStatus preCheckStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "upgrade_status", nullable = false, length = 32)
    private RolloutEnums.CheckStatus upgradeStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "post_check_status", nullable = false, length = 32)
    private RolloutEnums.CheckStatus postCheckStatus;

    @Version
    @Column(nullable = false)
    private Long version; // Prevents concurrent engineer overwrite conflicts

    @Column(name = "updated_by", length = 120)
    private String updatedBy;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist @PreUpdate
    void onTouch() { updatedAt = Instant.now(); }
}
