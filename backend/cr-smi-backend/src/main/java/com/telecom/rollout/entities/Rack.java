package com.telecom.rollout.entities;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "racks", uniqueConstraints = @UniqueConstraint(columnNames = {"site_id", "rack_code"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Rack {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "site_id", nullable = false)
    private Site site;

    @Column(name = "rack_name", nullable = false, length = 64)
    private String rackName;

    @Column(length = 255)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }
}
