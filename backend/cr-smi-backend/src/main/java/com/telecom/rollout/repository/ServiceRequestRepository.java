package com.telecom.rollout.repository;

import com.telecom.rollout.entities.ServiceRequest;
import com.telecom.rollout.enums.RolloutEnums;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, UUID> {
    @EntityGraph(attributePaths = {"changeRequest", "node", "node.rack", "node.rack.site"})
    List<ServiceRequest> findAllByOrderByUpdatedAtDesc();

    long countByStatusIn(List<RolloutEnums.SrStatus> statuses);
}
