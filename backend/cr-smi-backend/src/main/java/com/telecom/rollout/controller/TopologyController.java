package com.telecom.rollout.controller;

import com.telecom.rollout.dto.TopologyDtos.*;
import com.telecom.rollout.enums.RolloutEnums.NodeType;
import com.telecom.rollout.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/topology")
@RequiredArgsConstructor
public class TopologyController {
    private final SiteRepository siteRepository;
    private final RackRepository rackRepository;
    private final NodeRepository nodeRepository;

    @GetMapping("/sites")
    public List<SiteDto> getSites() {
        return siteRepository.findAll().stream()
                .map(s -> new SiteDto(s.getId(), s.getSiteCode(), s.getSiteName(), s.getRegion(), s.getNso()))
                .toList();
    }

    @GetMapping("/sites/{siteId}/racks")
    public List<RackDto> getRacksBySite(@PathVariable UUID siteId) {
        return rackRepository.findBySiteId(siteId).stream()
                .map(r -> new RackDto(r.getId(), r.getSite().getId(), r.getSite().getSiteCode(), r.getRackName(), r.getDescription()))
                .toList();
    }

    @GetMapping("/racks/{rackId}/nodes")
    public List<NodeDto> getNodesByRack(@PathVariable UUID rackId, @RequestParam(required = false) NodeType nodeType) {
        var nodes = (nodeType != null)
                ? nodeRepository.findByRackIdAndNodeType(rackId, nodeType)
                : nodeRepository.findByRackId(rackId);
        return nodes.stream()
                .map(n -> new NodeDto(
                        n.getId(), n.getRack().getId(), n.getRack().getRackName(),
                        n.getRack().getSite().getSiteCode(), n.getRack().getSite().getSiteName(),
                        n.getNodeName(), n.getNodeType(), n.getPlatform(),
                        n.getCurrentVersion(), n.getTargetVersion()
                ))
                .toList();
    }
}
