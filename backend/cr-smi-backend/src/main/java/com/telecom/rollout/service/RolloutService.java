package com.telecom.rollout.service;

import com.telecom.rollout.dto.RolloutDtos.*;
import com.telecom.rollout.entities.*;
import com.telecom.rollout.enums.RolloutEnums.*;
import com.telecom.rollout.repository.*;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RolloutService {
    private final ChangeRequestRepository crRepository;
    private final CrNodeExecutionRepository executionRepository;
    private final NodeRepository nodeRepository;
    private final ServiceRequestRepository srRepository;
    private final AuditService auditService;

    @Transactional
    public CrSummaryDto scheduleCr(CreateCrRequest req) {
        if (crRepository.findByCrNumberIgnoreCase(req.crNumber()).isPresent()) {
            throw new IllegalStateException("CR Number already exists: " + req.crNumber());
        }

        ChangeRequest cr = crRepository.save(ChangeRequest.builder()
                .crNumber(req.crNumber().trim().toUpperCase())
                .title(req.title())
                .ownerName(req.ownerName())
                .scheduledDate(req.scheduledDate())
                .windowStart(req.windowStart())
                .windowEnd(req.windowEnd())
                .executionMode(req.executionMode())
                .status(CrStatus.PLANNED)
                .build());

        List<CrNodeExecution> executions = new ArrayList<>();
        for (CreateCrRequest.NodeTargetSpec target : req.targets()) {
            Node node = nodeRepository.findById(target.nodeId())
                    .orElseThrow(() -> new EntityNotFoundException("Node not found: " + target.nodeId()));

            executions.add(CrNodeExecution.builder()
                    .changeRequest(cr)
                    .node(node)
                    .fromVersion(node.getCurrentVersion())
                    .toVersion(target.toVersion())
                    .preCheckStatus(CheckStatus.PENDING)
                    .upgradeStatus(CheckStatus.PENDING)
                    .postCheckStatus(CheckStatus.PENDING)
                    .updatedBy(req.ownerName())
                    .build());
        }
        executionRepository.saveAll(executions);

        auditService.record("CR", cr.getId(), "CR_SCHEDULED", null, CrStatus.PLANNED.name(),
                "Scheduled " + executions.size() + " target nodes", req.ownerName());

        return toCrSummary(cr, executions);
    }

    @Transactional
    public NodeExecutionRowDto updateNodeExecution(UUID executionId, UpdateNodeExecutionRequest req) {
        CrNodeExecution exec = executionRepository.findById(executionId)
                .orElseThrow(() -> new EntityNotFoundException("Execution row not found: " + executionId));

        CheckStatus nextPre = req.preCheckStatus() != null ? req.preCheckStatus() : exec.getPreCheckStatus();
        CheckStatus nextUpg = req.upgradeStatus() != null ? req.upgradeStatus() : exec.getUpgradeStatus();
        CheckStatus nextPost = req.postCheckStatus() != null ? req.postCheckStatus() : exec.getPostCheckStatus();

        // State Machine Guard: Block Upgrade if Pre-check != PASS unless overrideGuard=true
        if ((nextUpg == CheckStatus.IN_PROGRESS || nextUpg == CheckStatus.PASS)
                && nextPre != CheckStatus.PASS && !req.overrideGuard()) {
            throw new IllegalStateException("Cannot execute Upgrade before Pre-Check passes (enable overrideGuard with reason to bypass).");
        }
        // State Machine Guard: Block Post-check if Upgrade != PASS
        if ((nextPost == CheckStatus.IN_PROGRESS || nextPost == CheckStatus.PASS)
                && nextUpg != CheckStatus.PASS && !req.overrideGuard()) {
            throw new IllegalStateException("Cannot execute Post-Check before Upgrade passes.");
        }

        // Auto-block downstream steps if Pre-Check fails
        if (nextPre == CheckStatus.FAIL) {
            nextUpg = CheckStatus.BLOCKED;
            nextPost = CheckStatus.BLOCKED;
        }

        String prevSnapshot = String.format("Pre:%s|Upg:%s|Post:%s",
                exec.getPreCheckStatus(), exec.getUpgradeStatus(), exec.getPostCheckStatus());
        String nextSnapshot = String.format("Pre:%s|Upg:%s|Post:%s", nextPre, nextUpg, nextPost);

        exec.setPreCheckStatus(nextPre);
        exec.setUpgradeStatus(nextUpg);
        exec.setPostCheckStatus(nextPost);
        exec.setUpdatedBy(req.performedBy());

        // Update Node current_version when Post-check passes
        if (nextPost == CheckStatus.PASS) {
            Node node = exec.getNode();
            node.setCurrentVersion(exec.getToVersion());
            nodeRepository.save(node);
        }

        CrNodeExecution saved = executionRepository.save(exec);
        recalculateCrStatus(saved.getChangeRequest());

        auditService.record("CR", saved.getChangeRequest().getId(),
                "NODE_STATUS_UPDATED (" + saved.getNode().getNodeName() + ")",
                prevSnapshot, nextSnapshot, req.reason(), req.performedBy());

        return toRowDto(saved);
    }

    @Transactional
    public CrDetailDto updateCrStatus(UUID crId, UpdateCrStatusRequest req) {
        ChangeRequest cr = crRepository.findById(crId)
                .orElseThrow(() -> new EntityNotFoundException("CR not found: " + crId));
        String prev = cr.getStatus().name();
        cr.setStatus(req.status());
        crRepository.save(cr);

        auditService.record("CR", crId, "CR_STATUS_UPDATED", prev, req.status().name(),
                req.reason(), req.performedBy());
        return getCrDetail(crId);
    }

    @Transactional
    public CrDetailDto addAuditNote(UUID crId, AddAuditNoteRequest req) {
        ChangeRequest cr = crRepository.findById(crId)
                .orElseThrow(() -> new EntityNotFoundException("CR not found: " + crId));
        auditService.record("CR", cr.getId(), "ENGINEER_NOTE", null, null,
                req.reason(), req.performedBy());
        return getCrDetail(crId);
    }

    @Transactional(readOnly = true)
    public List<CrSummaryDto> listCrs(String crNumber, LocalDate fromDate, LocalDate toDate, CrStatus status) {
        return crRepository.findAll().stream()
                .filter(cr -> crNumber == null || crNumber.isBlank()
                        || cr.getCrNumber().toLowerCase().contains(crNumber.toLowerCase()))
                .filter(cr -> fromDate == null || !cr.getScheduledDate().isBefore(fromDate))
                .filter(cr -> toDate == null || !cr.getScheduledDate().isAfter(toDate))
                .filter(cr -> status == null || cr.getStatus() == status)
                .sorted(Comparator.comparing(ChangeRequest::getScheduledDate).reversed())
                .map(cr -> toCrSummary(cr, executionRepository.findByChangeRequestId(cr.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public CrDetailDto getCrDetail(UUID crId) {
        ChangeRequest cr = crRepository.findById(crId)
                .orElseThrow(() -> new EntityNotFoundException("CR not found: " + crId));
        List<CrNodeExecution> execs = executionRepository.findByChangeRequestId(crId);
        return new CrDetailDto(
                toCrSummary(cr, execs),
                execs.stream().map(this::toRowDto).toList(),
                auditService.getHistory("CR", crId)
        );
    }

    @Transactional(readOnly = true)
    public List<CalendarDaySummaryDto> getCalendarDensity(int year, int month) {
        LocalDate start = LocalDate.of(year, month, 1);
        LocalDate end = start.withDayOfMonth(start.lengthOfMonth());
        Map<LocalDate, List<ChangeRequest>> byDate = crRepository.findByScheduledDateBetween(start, end)
                .stream().collect(Collectors.groupingBy(ChangeRequest::getScheduledDate));

        return byDate.entrySet().stream()
                .map(e -> {
                    long planned = e.getValue().stream().filter(c -> c.getStatus() == CrStatus.PLANNED).count();
                    long scheduled = e.getValue().size() - planned;
                    return new CalendarDaySummaryDto(e.getKey(), scheduled, planned);
                })
                .sorted(Comparator.comparing(CalendarDaySummaryDto::date))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<NodeExecutionRowDto> getPlannerRows(LocalDate date, String siteCode, String rackName, NodeType nodeType) {
        List<CrNodeExecution> list = (date != null)
                ? executionRepository.findByChangeRequestScheduledDate(date)
                : executionRepository.findAll();

        return list.stream()
                .filter(e -> siteCode == null || siteCode.isBlank()
                        || e.getNode().getRack().getSite().getSiteCode().equalsIgnoreCase(siteCode))
                .filter(e -> rackName == null || rackName.isBlank()
                        || e.getNode().getRack().getRackName().equalsIgnoreCase(rackName))
                .filter(e -> nodeType == null || e.getNode().getNodeType() == nodeType)
                .map(this::toRowDto)
                .toList();
    }

    private void recalculateCrStatus(ChangeRequest cr) {
        List<CrNodeExecution> all = executionRepository.findByChangeRequestId(cr.getId());
        boolean anyFailed = all.stream().anyMatch(e ->
                e.getPreCheckStatus() == CheckStatus.FAIL ||
                        e.getUpgradeStatus() == CheckStatus.FAIL ||
                        e.getPostCheckStatus() == CheckStatus.FAIL);
        boolean allCompleted = !all.isEmpty() && all.stream().allMatch(e -> e.getPostCheckStatus() == CheckStatus.PASS);

        if (anyFailed) cr.setStatus(CrStatus.FAILED);
        else if (allCompleted) cr.setStatus(CrStatus.COMPLETED);
        else cr.setStatus(CrStatus.IN_PROGRESS);
        crRepository.save(cr);
    }

    public CrSummaryDto toCrSummary(ChangeRequest cr, List<CrNodeExecution> execs) {
        List<String> sites = execs.stream().map(e -> e.getNode().getRack().getSite().getSiteName()).distinct().toList();
        List<String> racks = execs.stream().map(e -> e.getNode().getRack().getRackName()).distinct().toList();
        int completed = (int) execs.stream().filter(e -> e.getPostCheckStatus() == CheckStatus.PASS).count();
        long openSrs = srRepository.findAllByOrderByUpdatedAtDesc().stream()
                .filter(sr -> sr.getChangeRequest().getId().equals(cr.getId())
                        && (sr.getStatus() == SrStatus.OPEN || sr.getStatus() == SrStatus.INVESTIGATING))
                .count();

        return new CrSummaryDto(
                cr.getId(), cr.getCrNumber(), cr.getTitle(), cr.getOwnerName(),
                cr.getScheduledDate(), cr.getWindowStart(), cr.getWindowEnd(),
                cr.getExecutionMode(), cr.getStatus(), sites, racks,
                execs.size(), completed, openSrs
        );
    }

    private NodeExecutionRowDto toRowDto(CrNodeExecution e) {
        Node n = e.getNode();
        Rack r = n.getRack();
        Site s = r.getSite();
        return new NodeExecutionRowDto(
                e.getId(), e.getChangeRequest().getId(), e.getChangeRequest().getCrNumber(),
                e.getChangeRequest().getStatus(), s.getSiteCode(), s.getSiteName(), s.getNso(),
                r.getRackName(), n.getId(), n.getNodeName(), n.getNodeType(),
                e.getFromVersion(), e.getToVersion(),
                e.getPreCheckStatus(), e.getUpgradeStatus(), e.getPostCheckStatus(),
                e.getUpdatedAt()
        );
    }
}