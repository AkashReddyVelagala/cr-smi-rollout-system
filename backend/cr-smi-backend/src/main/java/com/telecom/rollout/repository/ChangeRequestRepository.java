package com.telecom.rollout.repository;

import com.telecom.rollout.entities.ChangeRequest;
import com.telecom.rollout.enums.RolloutEnums;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChangeRequestRepository extends JpaRepository<ChangeRequest, UUID> {
    Optional<ChangeRequest> findByCrNumberIgnoreCase(String crNumber);
    List<ChangeRequest> findByScheduledDateBetween(LocalDate start, LocalDate end);
    long countByStatus(RolloutEnums.CrStatus status);
}
