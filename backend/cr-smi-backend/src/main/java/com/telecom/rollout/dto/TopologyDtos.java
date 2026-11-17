package com.telecom.rollout.dto;

import com.telecom.rollout.enums.RolloutEnums.NodeType;
import com.telecom.rollout.enums.RolloutEnums.Platform;

import java.util.UUID;

public class TopologyDtos {
    public record SiteDto(UUID id, String siteCode, String siteName, String region, String nso) {
    }

    public record RackDto(UUID id, UUID siteId, String siteCode, String rackName, String description) {
    }

    public record NodeDto(
            UUID id, UUID rackId, String rackName, String siteCode, String siteName,
            String nodeName, NodeType nodeType, Platform platform,
            String currentVersion, String targetVersion
    ) {
    }
}
