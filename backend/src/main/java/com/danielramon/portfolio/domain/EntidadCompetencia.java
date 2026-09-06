package com.danielramon.portfolio.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "competencies", uniqueConstraints = @UniqueConstraint(columnNames = "name"))
public class EntidadCompetencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 140)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private CategoriaCompetencia category;

    @Column(nullable = false, length = 500)
    private String evidence;

    protected EntidadCompetencia() {
    }

    public EntidadCompetencia(String name, CategoriaCompetencia category, String evidence) {
        this.name = name;
        this.category = category;
        this.evidence = evidence;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public CategoriaCompetencia getCategory() {
        return category;
    }

    public String getEvidence() {
        return evidence;
    }
}
