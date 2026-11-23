package com.telecom.rollout.repository;

import com.telecom.rollout.entities.Node;
import com.telecom.rollout.enums.RolloutEnums.NodeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NodeRepository extends JpaRepository<Node, UUID> {
    Optional<Node> findByNodeNameIgnoreCase(String nodeName);

    @EntityGraph(attributePaths = {"rack", "rack.site"})
    List<Node> findByRackIdAndNodeType(UUID rackId, NodeType nodeType);

    @EntityGraph(attributePaths = {"rack", "rack.site"})
    List<Node> findByRackId(UUID rackId);

    @Query("SELECT n FROM Node n JOIN FETCH n.rack r JOIN FETCH r.site WHERE r.id = :rackId")
    List<Node> findByRackIdWithHierarchy(@Param("rackId") UUID rackId);

    @Query("SELECT n FROM Node n JOIN FETCH n.rack r JOIN FETCH r.site WHERE r.id = :rackId AND n.nodeType = :nodeType")
    List<Node> findByRackIdAndNodeTypeWithHierarchy(@Param("rackId") UUID rackId, @Param("nodeType") NodeType nodeType);
}
