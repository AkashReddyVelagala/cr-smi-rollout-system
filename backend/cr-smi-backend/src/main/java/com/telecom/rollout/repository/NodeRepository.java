package com.telecom.rollout.repository;

import com.telecom.rollout.entities.Node;
import com.telecom.rollout.enums.RolloutEnums.NodeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NodeRepository extends JpaRepository<Node, UUID> {
    Optional<Node> findByNodeNameIgnoreCase(String nodeName);

    @EntityGraph(attributePaths = {"rack", "rack.site"})
    List<Node> findByRackIdAndNodeType(UUID rackId, NodeType nodeType);

    @EntityGraph(attributePaths = {"rack", "rack.site"})
    List<Node> findByRackId(UUID rackId);
}
