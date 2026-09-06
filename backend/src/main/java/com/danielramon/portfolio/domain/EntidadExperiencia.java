package com.danielramon.portfolio.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "experiences")
public class EntidadExperiencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String role;

    @Column(nullable = false, length = 120)
    private String company;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false, length = 500)
    private String context;

    @OneToMany(mappedBy = "experience", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("displayOrder ASC")
    private List<EntidadResponsabilidad> responsibilities = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "experience_technologies",
            joinColumns = @JoinColumn(name = "experience_id"),
            inverseJoinColumns = @JoinColumn(name = "technology_id")
    )
    private Set<EntidadTecnologia> technologies = new LinkedHashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "experience_competencies",
            joinColumns = @JoinColumn(name = "experience_id"),
            inverseJoinColumns = @JoinColumn(name = "competency_id")
    )
    private Set<EntidadCompetencia> competencies = new LinkedHashSet<>();

    protected EntidadExperiencia() {
    }

    public EntidadExperiencia(String role, String company, LocalDate startDate, LocalDate endDate, String context) {
        this.role = role;
        this.company = company;
        this.startDate = startDate;
        this.endDate = endDate;
        this.context = context;
    }

    public void addResponsibility(String description) {
        var responsabilidad = new EntidadResponsabilidad(responsibilities.size(), description);
        responsabilidad.attachTo(this);
        responsibilities.add(responsabilidad);
    }

    public void addTechnology(EntidadTecnologia technology) {
        technologies.add(technology);
    }

    public void addCompetency(EntidadCompetencia competency) {
        competencies.add(competency);
    }

    public Long getId() {
        return id;
    }

    public String getRole() {
        return role;
    }

    public String getCompany() {
        return company;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public String getContext() {
        return context;
    }

    public List<EntidadResponsabilidad> getResponsibilities() {
        return List.copyOf(responsibilities);
    }

    public Set<EntidadTecnologia> getTechnologies() {
        return Set.copyOf(technologies);
    }

    public Set<EntidadCompetencia> getCompetencies() {
        return Set.copyOf(competencies);
    }
}
