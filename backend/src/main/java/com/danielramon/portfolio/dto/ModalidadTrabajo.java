package com.danielramon.portfolio.dto;

public enum ModalidadTrabajo {
    REMOTE("Remoto"),
    HYBRID("Híbrido"),
    ON_SITE("Presencial"),
    FLEXIBLE("Flexible / Por definir");

    private final String label;

    ModalidadTrabajo(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
