package com.danielramon.portfolio.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "education")
public class EntidadFormacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String qualification;

    @Column(nullable = false, length = 100)
    private String institution;

    @Column(nullable = false)
    private int startYear;

    @Column(nullable = false)
    private int endYear;

    protected EntidadFormacion() {
    }

    public EntidadFormacion(String qualification, String institution, int startYear, int endYear) {
        this.qualification = qualification;
        this.institution = institution;
        this.startYear = startYear;
        this.endYear = endYear;
    }

    public Long getId() {
        return id;
    }

    public String getQualification() {
        return qualification;
    }

    public String getInstitution() {
        return institution;
    }

    public int getStartYear() {
        return startYear;
    }

    public int getEndYear() {
        return endYear;
    }
}
