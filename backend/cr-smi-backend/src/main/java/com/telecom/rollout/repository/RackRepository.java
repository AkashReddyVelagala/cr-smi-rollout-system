package com.telecom.rollout.repository;

import com.telecom.rollout.entities.Rack;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RackRepository extends JpaRepository<Rack, UUID> {
    List<Rack> findBySiteId(UUID siteId);
    Optional<Rack> findBySiteIdAndRackNameIgnoreCase(UUID siteId, String rackName);
}
