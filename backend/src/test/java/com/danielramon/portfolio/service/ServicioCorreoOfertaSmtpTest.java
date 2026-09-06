package com.danielramon.portfolio.service;

import com.danielramon.portfolio.config.PropiedadesOfertas;
import jakarta.mail.Message;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.Duration;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServicioCorreoOfertaSmtpTest {

    @Mock
    private JavaMailSender emisorCorreo;

    @Test
    void sendsToTheConfiguredRecipientWithRecruiterReplyTo() throws Exception {
        var mensaje = new MimeMessage(Session.getInstance(new Properties()));
        when(emisorCorreo.createMimeMessage()).thenReturn(mensaje);
        var service = service();

        service.send(FormateadorCorreoOfertaTest.request("Acme Software"));

        verify(emisorCorreo).send(mensaje);
        assertThat(mensaje.getRecipients(Message.RecipientType.TO)[0].toString())
                .isEqualTo("daniel@example.com");
        assertThat(mensaje.getReplyTo()[0].toString()).isEqualTo("laura@acme.com");
        assertThat(mensaje.getSubject()).isEqualTo("Nueva oferta desde el portfolio — Acme Software");
        assertThat(mensaje.getContent().toString()).contains("Plataforma con Angular y Java");
    }

    @Test
    void wrapsMailTransportErrors() {
        var mensaje = new MimeMessage(Session.getInstance(new Properties()));
        when(emisorCorreo.createMimeMessage()).thenReturn(mensaje);
        doThrow(new MailSendException("SMTP unavailable")).when(emisorCorreo).send(mensaje);

        assertThatThrownBy(() -> service().send(FormateadorCorreoOfertaTest.request("Acme Software")))
                .isInstanceOf(ErrorEntregaOferta.class)
                .hasMessage("Unable to deliver job-offer email");
    }

    private ServicioCorreoOfertaSmtp service() {
        var configuracion = new PropiedadesOfertas(
                new PropiedadesOfertas.Mail(
                        "smtp",
                        "Portfolio <jobs@example.com>",
                        "daniel@example.com",
                        false
                ),
                new PropiedadesOfertas.RateLimit(3, Duration.ofMinutes(15))
        );
        return new ServicioCorreoOfertaSmtp(
                emisorCorreo,
                new FormateadorCorreoOferta(),
                configuracion
        );
    }
}
