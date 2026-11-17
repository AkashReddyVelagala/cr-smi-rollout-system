package com.telecom.rollout.service;

import com.telecom.rollout.dto.RolloutDtos.*;
import com.telecom.rollout.entities.*;
import com.telecom.rollout.enums.RolloutEnums.*;
import com.telecom.rollout.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Year;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ServiceRequestService {
    private final ServiceRequestRepository srRepository;
    private final ChangeRequestRepository crRepository;
    private final NodeRepository nodeRepository;
    private final AuditService auditService;

    @Transactional
    public SrDto raiseSr(CreateSrRequest req) {
        ChangeRequest cr = crRepository.findById(req.crId())
                .orElseThrow(() -> new EntityNotFoundException("CR not found: " + req.crId()));
        Node node = nodeRepository.findById(req.nodeId())
                .orElseThrow(() -> new EntityNotFoundException("Node not found: " + req.nodeId()));

        String srNumber = String.format("SR-%d-%05d", Year.now().getValue(), srRepository.count() + 1001);

        ServiceRequest sr = srRepository.save(ServiceRequest.builder()
                .srNumber(srNumber)
                .changeRequest(cr)
                .node(node)
                .severity(req.severity())
                .summary(req.summary())
                .exitCode(req.exitCode())
                .status(SrStatus.OPEN)
                .assignedEngineer(req.assignedEngineer())
                .build());

        auditService.record("CR", cr.getId(), "SR_ESCALATED (" + srNumber + ")",
                null, req.severity().name(), req.summary(), req.assignedEngineer());
        auditService.record("SR", sr.getId(), "SR_CREATED", null, SrStatus.OPEN.name(),
                req.summary(), req.assignedEngineer());

        return toDto(sr);
    }

    @Transactional
    public SrDto updateSr(UUID srId, UpdateSrRequest req) {
        ServiceRequest sr = srRepository.findById(srId)
                .orElseThrow(() -> new EntityNotFoundException("SR not found: " + srId));
        String prev = sr.getStatus().name();
        sr.setStatus(req.status());
        ServiceRequest saved = srRepository.save(sr);

        auditService.record("SR", srId, "SR_STATUS_UPDATED", prev, req.status().name(),
                req.comment(), req.performedBy());
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<SrDto> listSrs(SrStatus status) {
        return srRepository.findAllByOrderByUpdatedAtDesc().stream()
                .filter(sr -> status == null || sr.getStatus() == status)
                .map(this::toDto)
                .toList();
    }

    private SrDto toDto(ServiceRequest sr) {
        Node n = sr.getNode();
        return new SrDto(
                sr.getId(), sr.getSrNumber(),
                sr.getChangeRequest().getId(), sr.getChangeRequest().getCrNumber(),
                n.getRack().getSite().getSiteName(), n.getRack().getRackName(),
                n.getId(), n.getNodeName(),
                sr.getSeverity(), sr.getSummary(), sr.getExitCode(),
                sr.getStatus(), sr.getAssignedEngineer(), sr.getUpdatedAt()
        );
    }
}
