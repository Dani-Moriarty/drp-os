package com.danielramon.portfolio.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "experience_responsibilities")
public class EntidadResponsabilidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "experience_id", nullable = false)
    private EntidadExperiencia experience;

    @Column(nullable = false)
    private int displayOrder;

    @Column(nullable = false, length = 1000)
    private String description;

    protected EntidadResponsabilidad() {
    }

    public EntidadResponsabilidad(int displayOrder, String description) {
        this.displayOrder = displayOrder;
        this.description = description;
    }

    void attachTo(EntidadExperiencia experience) {
        this.experience = experience;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public String getDescription() {
        return description;
    }
}
