package com.telecom.rollout.repository;

import com.telecom.rollout.entities.Rack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RackRepository extends JpaRepository<Rack, UUID> {
    @Query("SELECT r FROM Rack r JOIN FETCH r.site WHERE r.site.id = :siteId")
    List<Rack> findBySiteId(UUID siteId);
    Optional<Rack> findBySiteIdAndRackNameIgnoreCase(UUID siteId, String rackName);
}
