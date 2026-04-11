package com.legaltech.infrastructure.persistence.repository;

import com.legaltech.infrastructure.persistence.entity.LegalDocumentEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JpaLegalDocumentRepository extends JpaRepository<LegalDocumentEntity, String> {

    Page<LegalDocumentEntity> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Optional<LegalDocumentEntity> findByAbbreviation(String abbreviation);

    Optional<LegalDocumentEntity> findByEditionNumberAndDocumentType(String editionNumber, String documentType);

    List<LegalDocumentEntity> findByDocumentTypeIn(List<String> types);

    List<LegalDocumentEntity> findByAbbreviationIsNotNullOrderByPriorityAsc();
}
