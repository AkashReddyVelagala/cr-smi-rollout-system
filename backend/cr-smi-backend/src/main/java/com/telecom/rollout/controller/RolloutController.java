package com.telecom.rollout.controller;

import com.telecom.rollout.dto.RolloutDtos.*;
import com.telecom.rollout.enums.RolloutEnums.CrStatus;
import com.telecom.rollout.enums.RolloutEnums.NodeType;
import com.telecom.rollout.service.RolloutService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RolloutController {
    private final RolloutService rolloutService;

    @PostMapping("/crs")
    @ResponseStatus(HttpStatus.CREATED)
    public CrSummaryDto scheduleCr(@Valid @RequestBody CreateCrRequest request) {
        return rolloutService.scheduleCr(request);
    }

    @GetMapping("/crs")
    public List<CrSummaryDto> listCrs(
            @RequestParam(required = false) String crNumber,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) CrStatus status) {
        return rolloutService.listCrs(crNumber, fromDate, toDate, status);
    }

    @GetMapping("/crs/{crId}")
    public CrDetailDto getCrDetail(@PathVariable UUID crId) {
        return rolloutService.getCrDetail(crId);
    }

    @PatchMapping("/crs/{crId}/status")
    public CrDetailDto updateCrStatus(@PathVariable UUID crId, @Valid @RequestBody UpdateCrStatusRequest request) {
        return rolloutService.updateCrStatus(crId, request);
    }

    @PostMapping("/crs/{crId}/notes")
    public CrDetailDto addCrNote(@PathVariable UUID crId, @Valid @RequestBody AddAuditNoteRequest request) {
        return rolloutService.addAuditNote(crId, request);
    }

    @GetMapping("/planner/calendar")
    public List<CalendarDaySummaryDto> getCalendar(@RequestParam int year, @RequestParam int month) {
        return rolloutService.getCalendarDensity(year, month);
    }

    @GetMapping("/planner/executions")
    public List<NodeExecutionRowDto> getPlannerGrid(
            @RequestParam(required = false) LocalDate date,
            @RequestParam(required = false) String siteCode,
            @RequestParam(required = false) String rackName,
            @RequestParam(required = false) NodeType nodeType) {
        return rolloutService.getPlannerRows(date, siteCode, rackName, nodeType);
    }

    @PatchMapping("/planner/executions/{executionId}")
    public NodeExecutionRowDto updateNodeExecution(
            @PathVariable UUID executionId,
            @Valid @RequestBody UpdateNodeExecutionRequest request) {
        return rolloutService.updateNodeExecution(executionId, request);
    }
}
