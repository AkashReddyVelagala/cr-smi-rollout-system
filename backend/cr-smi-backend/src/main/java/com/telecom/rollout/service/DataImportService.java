package com.telecom.rollout.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.opencsv.CSVReader;
import com.telecom.rollout.dto.RolloutDtos.ImportRowPreviewDto;
import com.telecom.rollout.dto.RolloutDtos.ImportValidationResponse;
import com.telecom.rollout.entities.AuditLog;
import com.telecom.rollout.entities.Node;
import com.telecom.rollout.entities.Rack;
import com.telecom.rollout.entities.Site;
import com.telecom.rollout.enums.RolloutEnums.NodeType;
import com.telecom.rollout.enums.RolloutEnums.Platform;
import com.telecom.rollout.repository.NodeRepository;
import com.telecom.rollout.repository.RackRepository;
import com.telecom.rollout.repository.SiteRepository;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DataImportService {
    private final SiteRepository siteRepository;
    private final RackRepository rackRepository;
    private final NodeRepository nodeRepository;
    private final AuditService auditService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public ImportValidationResponse validateFile(MultipartFile file) {
        List<String[]> rawRows = parseRows(file);
        List<ImportRowPreviewDto> previews = new ArrayList<>();
        Set<String> seenNodeNames = new HashSet<>();

        int valid = 0, warn = 0, err = 0;
        for (int i = 0; i < rawRows.size(); i++) {
            String[] cols = rawRows.get(i);
            int rowNum = i + 2; // 1-based index + header row

            String crNum = getCol(cols, 0);
            String siteCode = getCol(cols, 1);
            String siteName = getCol(cols, 2);
            String region = getCol(cols, 3);
            String nso = getCol(cols, 4);
            String rackName = getCol(cols, 5);
            String nodeName = getCol(cols, 6);
            String nodeTypeStr = getCol(cols, 7);
            String currVer = getCol(cols, 8);
            String targetVer = getCol(cols, 9);

            String status = "VALID";
            String msg = "Ready to import";

            if (isNullOrNa(siteCode) || isNullOrNa(siteName) || isNullOrNa(region)
                    || isNullOrNa(nso) || isNullOrNa(rackName) || isNullOrNa(nodeName)
                    || isNullOrNa(nodeTypeStr) || isNullOrNa(currVer) || isNullOrNa(targetVer)) {
                status = "ERROR";
                msg = "Null, N/A, or blank values are not allowed in required fields";
                err++;
            } else if (!seenNodeNames.add(nodeName.trim().toUpperCase())) {
                status = "ERROR";
                msg = "Duplicate node_name in uploaded file: " + nodeName;
                err++;
            } else if (!isValidNodeType(nodeTypeStr)) {
                status = "ERROR";
                msg = "Unsupported node_type: " + nodeTypeStr;
                err++;
            } else if (currVer.trim().equalsIgnoreCase(targetVer.trim())) {
                status = "WARNING";
                msg = "Current version matches target version (no upgrade)";
                warn++;
            } else if (nodeRepository.findByNodeNameIgnoreCase(nodeName.trim()).isPresent()) {
                status = "WARNING";
                msg = "Node already exists in DB — target_version will be updated";
                warn++;
            } else {
                valid++;
            }

            previews.add(new ImportRowPreviewDto(
                    rowNum, crNum, siteCode, siteName, region, nso,
                    rackName, nodeName, nodeTypeStr.toUpperCase(),
                    currVer, targetVer, status, msg
            ));
        }

        String summary = String.format("Total: %d | Valid: %d | Warnings: %d | Errors: %d",
                previews.size(), valid, warn, err);

        String safeFileName = (file.getOriginalFilename() != null && !file.getOriginalFilename().isBlank())
                ? file.getOriginalFilename()
                : "upload.xlsx";

        auditService.record("DATA_IMPORT", UUID.randomUUID(), "BULK_DATA_IMPORTED",
                safeFileName, toJson(previews), summary, "Engineer");

        return new ImportValidationResponse(previews.size(), valid, warn, err, previews);
    }

    @Transactional
    public int commitImportedRows(List<ImportRowPreviewDto> rows, String performedBy) {
        int imported = 0;
        for (ImportRowPreviewDto row : rows) {
            if ("ERROR".equalsIgnoreCase(row.validationStatus())) continue;

            Site site = siteRepository.findBySiteCodeIgnoreCase(row.siteCode())
                    .orElseGet(() -> siteRepository.save(Site.builder()
                            .siteCode(row.siteCode().toUpperCase())
                            .siteName(row.siteName().isBlank() ? row.siteCode() : row.siteName())
                            .region(row.region().isBlank() ? "DEFAULT" : row.region())
                            .nso(row.nso().isBlank() ? "NSO-DEFAULT" : row.nso())
                            .build()));

            Rack rack = rackRepository.findBySiteIdAndRackNameIgnoreCase(site.getId(), row.rackName())
                    .orElseGet(() -> rackRepository.save(Rack.builder()
                            .site(site)
                            .rackName(row.rackName().toUpperCase())
                            .description("Imported via Load Data")
                            .build()));

            Node node = nodeRepository.findByNodeNameIgnoreCase(row.nodeName())
                    .orElseGet(() -> Node.builder()
                            .rack(rack)
                            .nodeName(row.nodeName().toUpperCase())
                            .nodeType(NodeType.valueOf(row.nodeType().toUpperCase()))
                            .platform(Platform.CNDP)
                            .currentVersion(row.currentVersion().isBlank() ? "DEFAULT_VERSION" : row.currentVersion())
                            .build());

            node.setTargetVersion(row.targetVersion());
            nodeRepository.save(node);
            imported++;
        }

        auditService.record("DATA_IMPORT", UUID.randomUUID(), "BULK_DATA_IMPORTED",
                null, toJson(rows), "Imported " + imported + " node(s) into DB", performedBy);


        return imported;
    }

    public List<AuditLog> getImportHistory() {
        return auditService.getHistory("DATA_IMPORT");
    }

    private List<String[]> parseRows(MultipartFile file) {
        String filename = Objects.requireNonNullElse(file.getOriginalFilename(), "").toLowerCase();
        List<String[]> rows = new ArrayList<>();
        try {
            if (filename.endsWith(".csv")) {
                try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream()))) {
                    List<String[]> all = reader.readAll();
                    if (all.size() > 1) rows.addAll(all.subList(1, all.size()));
                }
            } else if (filename.endsWith(".xlsx")) {
                try (Workbook wb = new XSSFWorkbook(file.getInputStream())) {
                    Sheet sheet = wb.getSheetAt(0);
                    DataFormatter formatter = new DataFormatter();
                    for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                        Row row = sheet.getRow(r);
                        if (row == null) continue;
                        String[] cols = new String[10];
                        for (int c = 0; c < 10; c++) {
                            cols[c] = formatter.formatCellValue(row.getCell(c));
                        }
                        rows.add(cols);
                    }
                }
            } else {
                throw new IllegalArgumentException("Unsupported file type. Upload .csv or .xlsx");
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to parse uploaded data file: " + e.getMessage(), e);
        }
        return rows;
    }

    private String getCol(String[] cols, int idx) {
        return idx < cols.length && cols[idx] != null ? cols[idx].trim() : "";
    }

    private boolean isValidNodeType(String val) {
        try {
            NodeType.valueOf(val.trim().toUpperCase());
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isNullOrNa(String val) {
        if (val == null || val.isBlank()) {
            return true;
        }
        String trimmed = val.trim();
        return trimmed.equalsIgnoreCase("N/A")
                || trimmed.equalsIgnoreCase("NA")
                || trimmed.equalsIgnoreCase("NULL")
                || trimmed.equals("-");
    }

    private String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            return "[]";
        }
    }
}
