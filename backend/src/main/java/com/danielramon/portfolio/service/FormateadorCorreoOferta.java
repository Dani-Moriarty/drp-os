package com.danielramon.portfolio.service;

import com.danielramon.portfolio.dto.SolicitudOferta;
import org.springframework.stereotype.Component;

@Component
public class FormateadorCorreoOferta {

    public String subject(SolicitudOferta solicitud) {
        return "Nueva oferta desde el portfolio — " + enUnaLinea(solicitud.company());
    }

    public String body(SolicitudOferta solicitud) {
        return """
                Nueva oferta recibida desde el portfolio

                Empresa:
                %s

                Contacto:
                %s
                %s

                ¿De qué trata la posición?
                %s

                ---
                Enviado desde el portfolio profesional de Daniel Ramón Pérez
                """.formatted(
                solicitud.company(),
                solicitud.contactName(),
                solicitud.contactEmail(),
                solicitud.positionDescription()
        );
    }

    private String enUnaLinea(String valor) {
        return valor.replace('\r', ' ').replace('\n', ' ').trim();
    }
}
