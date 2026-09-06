package com.danielramon.portfolio.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudOferta(
        @NotBlank @Size(max = 120) String company,
        @NotBlank @Size(max = 2000) String positionDescription,
        @NotBlank @Size(max = 100) String contactName,
        @NotBlank @Email @Size(max = 254) String contactEmail,
        @Size(max = 200) String website
) {
    public boolean honeypotFilled() {
        return website != null && !website.isBlank();
    }

    public SolicitudOferta normalized() {
        return new SolicitudOferta(
                company.trim(),
                positionDescription.trim(),
                contactName.trim(),
                contactEmail.trim(),
                null
        );
    }
}
