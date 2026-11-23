package com.telecom.rollout.service;

import com.telecom.rollout.dto.RolloutDtos.AuditLogDto;
import com.telecom.rollout.entities.AuditLog;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditService {
    private final com.telecom.rollout.repository.AuditLogRepository auditLogRepository;

    @Transactional
    public void record(String entityType, UUID entityId, String action,
                       String prevState, String newState, String reason, String performedBy) {
        AuditLog log = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .previousState(prevState)
                .newState(newState)
                .reason(reason)
                .performedBy(performedBy)
                .build();
        auditLogRepository.save(log);
    }

    @Transactional(readOnly = true)
    public List<AuditLogDto> getHistory(String entityType, UUID entityId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByCreatedAtDesc(entityType, entityId)
                .stream()
                .map(a -> new AuditLogDto(
                        a.getId(), a.getEntityType(), a.getAction(),
                        a.getPreviousState(), a.getNewState(),
                        a.getReason(), a.getPerformedBy(), a.getCreatedAt()
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getHistory(String entityType) {
        return auditLogRepository.findByEntityTypeOrderByCreatedAtDesc(entityType); }
}
