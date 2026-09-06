package com.danielramon.portfolio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudPublicacionTablon(
        @NotBlank @Size(max = 60) String author,
        @NotBlank @Size(max = 1000) String message,
        @Size(max = 200) String website
) {
    public SolicitudPublicacionTablon normalized() {
        return new SolicitudPublicacionTablon(
                normalize(author),
                normalizeMultiline(message),
                normalize(website)
        );
    }

    public boolean honeypotFilled() {
        return website != null && !website.isBlank();
    }

    private static String normalize(String value) {
        return value == null ? null : value.strip();
    }

    private static String normalizeMultiline(String value) {
        if (value == null) {
            return null;
        }
        return value.replace("\r\n", "\n").replace('\r', '\n').strip();
    }
}
