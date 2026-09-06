package com.danielramon.portfolio.service;

import com.danielramon.portfolio.dto.SolicitudOferta;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FormateadorCorreoOfertaTest {

    private final FormateadorCorreoOferta formateador = new FormateadorCorreoOferta();

    @Test
    void formatsAReadableMessageAndSanitizesTheSubjectLine() {
        var solicitud = request("Acme\r\nSoftware");

        assertThat(formateador.subject(solicitud)).isEqualTo("Nueva oferta desde el portfolio — Acme  Software");
        assertThat(formateador.body(solicitud))
                .contains("Laura García", "laura@acme.com")
                .contains("Plataforma con Angular y Java")
                .contains("Enviado desde el portfolio profesional de Daniel Ramón Pérez");
    }

    static SolicitudOferta request(String company) {
        return new SolicitudOferta(
                company,
                "Plataforma con Angular y Java",
                "Laura García",
                "laura@acme.com",
                null
        );
    }
}
