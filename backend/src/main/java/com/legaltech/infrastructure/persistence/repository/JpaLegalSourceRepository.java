package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.LegalSourceEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface JpaLegalSourceRepository extends JpaRepository<LegalSourceEntity, String> {
    Optional<LegalSourceEntity> findByType(String type);
}
