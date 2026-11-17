package com.telecom.rollout.service;

import com.telecom.rollout.dto.RolloutDtos.CrSummaryDto;
import com.telecom.rollout.dto.RolloutDtos.DashboardKpiDto;
import com.telecom.rollout.dto.RolloutDtos.DashboardKpiDto.NodeTypeStatsDto;
import com.telecom.rollout.entities.ChangeRequest;
import com.telecom.rollout.entities.CrNodeExecution;
import com.telecom.rollout.enums.RolloutEnums.*;
import com.telecom.rollout.repository.ChangeRequestRepository;
import com.telecom.rollout.repository.CrNodeExecutionRepository;
import com.telecom.rollout.repository.ServiceRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class DashboardService {
    private final ChangeRequestRepository crRepository;
    private final CrNodeExecutionRepository executionRepository;
    private final ServiceRequestRepository srRepository;
    private final RolloutService rolloutService;

    @Transactional(readOnly = true)
    public DashboardKpiDto getDashboardMetrics(String siteCode) {
        List<ChangeRequest> allCrs = crRepository.findAll();
        List<CrNodeExecution> allExecs = executionRepository.findAll().stream()
                .filter(e -> siteCode == null || siteCode.isBlank()
                        || e.getNode().getRack().getSite().getSiteCode().equalsIgnoreCase(siteCode))
                .toList();

        long activeCrs = allCrs.stream()
                .filter(c -> c.getStatus() == CrStatus.IN_PROGRESS || c.getStatus() == CrStatus.PLANNED)
                .count();
        long nodesPlanned = allExecs.size();
        long openSrs = srRepository.countByStatusIn(List.of(SrStatus.OPEN, SrStatus.INVESTIGATING));

        double overallRate = computeSuccessRate(allExecs);
        double manualRate = computeSuccessRate(allExecs.stream()
                .filter(e -> e.getChangeRequest().getExecutionMode() == ExecutionMode.MANUAL).toList());
        double singleClickRate = computeSuccessRate(allExecs.stream()
                .filter(e -> e.getChangeRequest().getExecutionMode() == ExecutionMode.SINGLE_CLICK).toList());

        Map<String, Long> statusSplit = new LinkedHashMap<>();
        statusSplit.put("Upgraded", allExecs.stream().filter(e -> e.getPostCheckStatus() == CheckStatus.PASS).count());
        statusSplit.put("Pre-check Passed", allExecs.stream().filter(e -> e.getPreCheckStatus() == CheckStatus.PASS && e.getPostCheckStatus() != CheckStatus.PASS).count());
        statusSplit.put("Planned", allExecs.stream().filter(e -> e.getPreCheckStatus() == CheckStatus.PENDING).count());
        statusSplit.put("Failed", allExecs.stream().filter(e -> e.getPreCheckStatus() == CheckStatus.FAIL || e.getUpgradeStatus() == CheckStatus.FAIL || e.getPostCheckStatus() == CheckStatus.FAIL).count());

        List<NodeTypeStatsDto> breakdown = Arrays.stream(NodeType.values())
                .map(type -> {
                    List<CrNodeExecution> byType = allExecs.stream()
                            .filter(e -> e.getNode().getNodeType() == type).toList();
                    long passed = byType.stream().filter(e -> e.getPostCheckStatus() == CheckStatus.PASS).count();
                    long failed = byType.stream().filter(e -> e.getPreCheckStatus() == CheckStatus.FAIL || e.getUpgradeStatus() == CheckStatus.FAIL || e.getPostCheckStatus() == CheckStatus.FAIL).count();
                    long pending = byType.size() - passed - failed;
                    return new NodeTypeStatsDto(type.name(), passed, failed, pending);
                })
                .filter(stat -> (stat.passed() + stat.failed() + stat.pending()) > 0)
                .toList();

        List<CrSummaryDto> recentCrs = allCrs.stream()
                .sorted(Comparator.comparing(ChangeRequest::getScheduledDate).reversed())
                .limit(10)
                .map(cr -> rolloutService.toCrSummary(cr, executionRepository.findByChangeRequestId(cr.getId())))
                .toList();

        return new DashboardKpiDto(
                activeCrs, nodesPlanned, openSrs,
                overallRate, manualRate, singleClickRate,
                statusSplit, breakdown, recentCrs
        );
    }

    private double computeSuccessRate(List<CrNodeExecution> list) {
        if (list.isEmpty()) return 100.0;
        long passed = list.stream().filter(e -> e.getPostCheckStatus() == CheckStatus.PASS).count();
        long failed = list.stream().filter(e ->
                e.getPreCheckStatus() == CheckStatus.FAIL ||
                        e.getUpgradeStatus() == CheckStatus.FAIL ||
                        e.getPostCheckStatus() == CheckStatus.FAIL).count();
        long finished = passed + failed;
        if (finished == 0) return 100.0;
        return Math.round((passed * 1000.0) / finished) / 10.0;
    }
}
