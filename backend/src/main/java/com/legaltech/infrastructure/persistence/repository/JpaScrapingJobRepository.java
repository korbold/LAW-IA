package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.ScrapingJobEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JpaScrapingJobRepository extends JpaRepository<ScrapingJobEntity, String> {
    Page<ScrapingJobEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);
    List<ScrapingJobEntity> findByStatus(String status);
    List<ScrapingJobEntity> findByJobTypeAndStatusIn(String jobType, List<String> statuses);
}
