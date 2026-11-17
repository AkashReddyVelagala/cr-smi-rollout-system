package com.telecom.rollout.dto;

import com.telecom.rollout.enums.RolloutEnums.*;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class RolloutDtos {
    public record CreateCrRequest(
            @NotBlank String crNumber,
            @NotBlank String title,
            @NotBlank String ownerName,
            @NotNull LocalDate scheduledDate,
            @NotNull Instant windowStart,
            @NotNull Instant windowEnd,
            @NotNull ExecutionMode executionMode,
            @NotEmpty List<NodeTargetSpec> targets
    ) {
        public record NodeTargetSpec(@NotNull UUID nodeId, @NotBlank String toVersion) {}
    }

    public record UpdateCrStatusRequest(
            @NotNull CrStatus status,
            @NotBlank String reason,
            @NotBlank String performedBy
    ) {}

    public record UpdateNodeExecutionRequest(
            CheckStatus preCheckStatus,
            CheckStatus upgradeStatus,
            CheckStatus postCheckStatus,
            boolean overrideGuard,
            @NotBlank String reason,
            @NotBlank String performedBy
    ) {}

    public record AddAuditNoteRequest(
            @NotBlank String reason,
            @NotBlank String performedBy
    ) {}

    public record NodeExecutionRowDto(
            UUID executionId, UUID crId, String crNumber, CrStatus crStatus,
            String siteCode, String siteName, String nso,
            String rackName, UUID nodeId, String nodeName, NodeType nodeType,
            String currentVersion, String updatedVersion,
            CheckStatus preCheckStatus, CheckStatus upgradeStatus, CheckStatus postCheckStatus,
            Instant lastUpdated
    ) {}

    public record CrSummaryDto(
            UUID id, String crNumber, String title, String ownerName,
            LocalDate scheduledDate, Instant windowStart, Instant windowEnd,
            ExecutionMode executionMode, CrStatus status,
            List<String> targetSites, List<String> targetRacks,
            int totalNodes, int completedNodes, long openSrCount
    ) {}

    public record CrDetailDto(
            CrSummaryDto summary,
            List<NodeExecutionRowDto> executions,
            List<AuditLogDto> auditLogs
    ) {}

    public record AuditLogDto(
            UUID id, String entityType, String action,
            String previousState, String newState,
            String reason, String performedBy, Instant createdAt
    ) {}

    public record CalendarDaySummaryDto(LocalDate date, long scheduledCount, long plannedCount) {}

    public record CreateSrRequest(
            @NotNull UUID crId,
            @NotNull UUID nodeId,
            @NotNull SrSeverity severity,
            @NotBlank String summary,
            String exitCode,
            @NotBlank String assignedEngineer
    ) {}

    public record UpdateSrRequest(
            @NotNull SrStatus status,
            @NotBlank String comment,
            @NotBlank String performedBy
    ) {}

    public record SrDto(
            UUID id, String srNumber, UUID crId, String crNumber,
            String siteName, String rackName, UUID nodeId, String nodeName,
            SrSeverity severity, String summary, String exitCode,
            SrStatus status, String assignedEngineer, Instant updatedAt
    ) {}

    public record DashboardKpiDto(
            long activeCrs,
            long nodesPlanned,
            long openSrs,
            double overallSuccessRate,
            double manualSuccessRate,
            double singleClickSuccessRate,
            Map<String, Long> statusSplit,
            List<NodeTypeStatsDto> nodeTypeBreakdown,
            List<CrSummaryDto> recentCrs
    ) {
        public record NodeTypeStatsDto(String nodeType, long passed, long failed, long pending) {}
    }

    public record ImportRowPreviewDto(
            int rowNumber,
            String crNumber,
            String siteCode,
            String siteName,
            String region,
            String nso,
            String rackName,
            String nodeName,
            String nodeType,
            String currentVersion,
            String targetVersion,
            String validationStatus, // VALID, WARNING, ERROR
            String message
    ) {}

    public record ImportValidationResponse(
            int totalRows,
            int validCount,
            int warningCount,
            int errorCount,
            List<ImportRowPreviewDto> rows
    ) {}
}
