package com.danielramon.portfolio.service;

import com.danielramon.portfolio.dto.SolicitudOferta;
import com.danielramon.portfolio.config.PropiedadesOfertas;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Service
@ConditionalOnProperty(
        name = "app.job-offers.mail.mode",
        havingValue = "log",
        matchIfMissing = true
)
public class ServicioCorreoOfertaLog implements ServicioCorreoOferta {

    private static final Logger LOGGER = LoggerFactory.getLogger(ServicioCorreoOfertaLog.class);
    private final FormateadorCorreoOferta formateador;
    private final PropiedadesOfertas configuracion;

    public ServicioCorreoOfertaLog(
            FormateadorCorreoOferta formateador,
            PropiedadesOfertas configuracion
    ) {
        this.formateador = formateador;
        this.configuracion = configuracion;
    }

    @Override
    public void send(SolicitudOferta solicitud) {
        if (configuracion.mail().logContent()) {
            LOGGER.info(
                    "Local job-offer email preview (not delivered)\nSubject: {}\nReply-To: {}\n\n{}",
                    formateador.subject(solicitud),
                    solicitud.contactEmail(),
                    formateador.body(solicitud)
            );
            return;
        }
        LOGGER.info("Local job-offer email accepted in simulation mode (content hidden).");
    }
}
