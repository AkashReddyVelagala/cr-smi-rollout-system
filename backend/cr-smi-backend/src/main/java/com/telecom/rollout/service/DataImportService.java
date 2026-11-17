package com.telecom.rollout.service;

import com.opencsv.CSVReader;
import com.telecom.rollout.dto.RolloutDtos.ImportRowPreviewDto;
import com.telecom.rollout.dto.RolloutDtos.ImportValidationResponse;
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

            if (siteCode.isBlank() || rackName.isBlank() || nodeName.isBlank() || targetVer.isBlank()) {
                status = "ERROR";
                msg = "Missing mandatory field (site_code, rack_name, node_name, or target_version)";
                err++;
            } else if (!seenNodeNames.add(nodeName.toUpperCase())) {
                status = "ERROR";
                msg = "Duplicate node_name in uploaded file: " + nodeName;
                err++;
            } else if (!isValidNodeType(nodeTypeStr)) {
                status = "ERROR";
                msg = "Unsupported node_type: " + nodeTypeStr;
                err++;
            } else if (currVer.equalsIgnoreCase(targetVer)) {
                status = "WARNING";
                msg = "Current version matches target version (no-op upgrade)";
                warn++;
            } else if (nodeRepository.findByNodeNameIgnoreCase(nodeName).isPresent()) {
                status = "WARNING";
                msg = "Existing node will have target_version updated";
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
                            .region(row.region().isBlank() ? "South" : row.region())
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
                            .currentVersion(row.currentVersion().isBlank() ? "2024.01.0" : row.currentVersion())
                            .build());

            node.setTargetVersion(row.targetVersion());
            nodeRepository.save(node);
            imported++;
        }

        auditService.record("DATA_IMPORT", UUID.randomUUID(), "BULK_DATA_IMPORTED",
                null, "IMPORTED", "Persisted " + imported + " nodes", performedBy);
        return imported;
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
}
