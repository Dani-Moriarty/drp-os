package com.danielramon.portfolio.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "language_qualifications")
public class EntidadAcreditacionIdioma {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private int displayOrder;

    @Column(nullable = false, length = 80)
    private String language;

    @Column(nullable = false, length = 80)
    private String level;

    @Column(nullable = false, length = 100)
    private String issuer;

    protected EntidadAcreditacionIdioma() {
    }

    public EntidadAcreditacionIdioma(int displayOrder, String language, String level, String issuer) {
        this.displayOrder = displayOrder;
        this.language = language;
        this.level = level;
        this.issuer = issuer;
    }

    public Long getId() {
        return id;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public String getLanguage() {
        return language;
    }

    public String getLevel() {
        return level;
    }

    public String getIssuer() {
        return issuer;
    }
}
