package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.ScrapingScheduleEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JpaScrapingScheduleRepository extends JpaRepository<ScrapingScheduleEntity, String> {
    Optional<ScrapingScheduleEntity> findBySection(String section);
    List<ScrapingScheduleEntity> findByEnabledTrue();
}
