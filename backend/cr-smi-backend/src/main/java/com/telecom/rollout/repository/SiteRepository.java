package com.telecom.rollout.repository;

import com.telecom.rollout.entities.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface SiteRepository extends JpaRepository<Site, UUID> {
    Optional<Site> findBySiteCodeIgnoreCase(String siteCode);
    Optional<Site> findBySiteNameIgnoreCase(String siteName);
}