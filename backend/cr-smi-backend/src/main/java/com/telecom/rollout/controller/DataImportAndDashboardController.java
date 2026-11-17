package com.telecom.rollout.controller;

import com.telecom.rollout.dto.RolloutDtos.DashboardKpiDto;
import com.telecom.rollout.dto.RolloutDtos.ImportRowPreviewDto;
import com.telecom.rollout.dto.RolloutDtos.ImportValidationResponse;
import com.telecom.rollout.service.DashboardService;
import com.telecom.rollout.service.DataImportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class DataImportAndDashboardController {
    private final DataImportService dataImportService;
    private final DashboardService dashboardService;

    @GetMapping("/dashboard/kpis")
    public DashboardKpiDto getDashboardKpis(@RequestParam(required = false) String siteCode) {
        return dashboardService.getDashboardMetrics(siteCode);
    }

    @PostMapping(value = "/import/validate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ImportValidationResponse validateImportFile(@RequestParam("file") MultipartFile file) {
        return dataImportService.validateFile(file);
    }

    @PostMapping("/import/commit")
    public Map<String, Object> commitImportData(
            @RequestBody List<ImportRowPreviewDto> rows,
            @RequestParam(defaultValue = "Operations Engineer") String performedBy) {
        int count = dataImportService.commitImportedRows(rows, performedBy);
        return Map.of("status", "IMPORTED", "nodesPersisted", count);
    }

    @GetMapping("/import/template")
    public ResponseEntity<String> downloadSampleCsv() {
        String csv = "cr_number,site_code,site_name,region,nso,rack_name,node_name,node_type,current_version,target_version\n"
                + "CR-2026-2001,ANP,Andhra Pradesh,South,NSO-SOUTH-ANP-01,APCP0100,APSMFI22,SMF,2024.02.1,2026.01.0\n";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=cr_smi_import_template.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv);
    }
}
