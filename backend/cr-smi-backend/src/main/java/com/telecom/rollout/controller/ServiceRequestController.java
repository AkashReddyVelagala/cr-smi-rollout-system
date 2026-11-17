package com.telecom.rollout.controller;

import com.telecom.rollout.dto.RolloutDtos.*;
import com.telecom.rollout.enums.RolloutEnums.SrStatus;
import com.telecom.rollout.service.AuditService;
import com.telecom.rollout.service.ServiceRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/srs")
@RequiredArgsConstructor
public class ServiceRequestController {
    private final ServiceRequestService srService;
    private final AuditService auditService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SrDto raiseSr(@Valid @RequestBody CreateSrRequest request) {
        return srService.raiseSr(request);
    }

    @GetMapping
    public List<SrDto> listSrs(@RequestParam(required = false) SrStatus status) {
        return srService.listSrs(status);
    }

    @PatchMapping("/{srId}")
    public SrDto updateSr(@PathVariable UUID srId, @Valid @RequestBody UpdateSrRequest request) {
        return srService.updateSr(srId, request);
    }

    @GetMapping("/{srId}/history")
    public List<AuditLogDto> getSrHistory(@PathVariable UUID srId) {
        return auditService.getHistory("SR", srId);
    }
}