package com.danielramon.portfolio.service;

import com.danielramon.portfolio.config.PropiedadesOfertas;
import com.danielramon.portfolio.dto.SolicitudOferta;
import jakarta.mail.MessagingException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Service
@ConditionalOnProperty(name = "app.job-offers.mail.mode", havingValue = "smtp")
public class ServicioCorreoOfertaSmtp implements ServicioCorreoOferta {

    private final JavaMailSender emisorCorreo;
    private final FormateadorCorreoOferta formateador;
    private final PropiedadesOfertas configuracion;

    public ServicioCorreoOfertaSmtp(
            JavaMailSender emisorCorreo,
            FormateadorCorreoOferta formateador,
            PropiedadesOfertas configuracion
    ) {
        this.emisorCorreo = emisorCorreo;
        this.formateador = formateador;
        this.configuracion = configuracion;
    }

    @Override
    public void send(SolicitudOferta solicitud) {
        validateConfiguration();
        try {
            var mensaje = emisorCorreo.createMimeMessage();
            var helper = new MimeMessageHelper(mensaje, false, StandardCharsets.UTF_8.name());
            helper.setFrom(configuracion.mail().from());
            helper.setTo(configuracion.mail().to());
            helper.setReplyTo(solicitud.contactEmail());
            helper.setSubject(formateador.subject(solicitud));
            helper.setText(formateador.body(solicitud), false);
            emisorCorreo.send(mensaje);
        } catch (MessagingException | MailException excepcion) {
            throw new ErrorEntregaOferta("Unable to deliver job-offer email", excepcion);
        }
    }

    private void validateConfiguration() {
        if (configuracion.mail().from() == null || configuracion.mail().from().isBlank()
                || configuracion.mail().to() == null || configuracion.mail().to().isBlank()) {
            throw new ErrorEntregaOferta("SMTP sender and recipient must be configured");
        }
    }
}
