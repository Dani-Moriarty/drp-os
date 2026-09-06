package com.danielramon.portfolio.dto;

public enum TipoContrato {
    PERMANENT("Indefinido"),
    TEMPORARY("Temporal"),
    FREELANCE("Freelance / Autónomo"),
    INTERNSHIP("Prácticas"),
    OTHER("Otro"),
    UNDEFINED("Por definir");

    private final String label;

    TipoContrato(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
