package com.danielramon.portfolio.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "profiles")
public class EntidadPerfil {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, length = 120)
    private String headline;

    @Column(nullable = false, length = 120)
    private String location;

    @Column(nullable = false, length = 40)
    private String phone;

    @Column(nullable = false, length = 180)
    private String email;

    @Column(nullable = false, length = 240)
    private String linkedInUrl;

    @Column(nullable = false, length = 1200)
    private String summary;

    protected EntidadPerfil() {
    }

    public EntidadPerfil(
            String fullName,
            String headline,
            String location,
            String phone,
            String email,
            String linkedInUrl,
            String summary
    ) {
        this.fullName = fullName;
        this.headline = headline;
        this.location = location;
        this.phone = phone;
        this.email = email;
        this.linkedInUrl = linkedInUrl;
        this.summary = summary;
    }

    public Long getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getHeadline() {
        return headline;
    }

    public String getLocation() {
        return location;
    }

    public String getPhone() {
        return phone;
    }

    public String getEmail() {
        return email;
    }

    public String getLinkedInUrl() {
        return linkedInUrl;
    }

    public String getSummary() {
        return summary;
    }
}
