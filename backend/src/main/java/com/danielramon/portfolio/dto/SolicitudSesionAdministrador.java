package com.danielramon.portfolio.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitudSesionAdministrador(
        @NotBlank @Size(max = 128) String code
) {
}
