package com.telecom.rollout.repository;

import com.telecom.rollout.entities.CrNodeExecution;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface CrNodeExecutionRepository extends JpaRepository<CrNodeExecution, UUID> {
    @EntityGraph(attributePaths = {"changeRequest", "node", "node.rack", "node.rack.site"})
    List<CrNodeExecution> findByChangeRequestScheduledDate(LocalDate scheduledDate);

    @EntityGraph(attributePaths = {"changeRequest", "node", "node.rack", "node.rack.site"})
    List<CrNodeExecution> findByChangeRequestId(UUID crId);
}
