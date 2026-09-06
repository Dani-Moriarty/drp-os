package com.danielramon.portfolio.service;

import com.danielramon.portfolio.dto.SolicitudOferta;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ServicioEnvioOfertaTest {

    @Mock
    private ServicioCorreoOferta servicioCorreo;

    @Test
    void trimsInputBeforeDelivery() {
        var service = new ServicioEnvioOferta(servicioCorreo);
        var solicitud = new SolicitudOferta(
                "  Acme Software  ",
                "  Proyecto de gestión  ",
                "  Laura García  ",
                "  laura@acme.com  ",
                null
        );

        service.submit(solicitud);

        var captor = ArgumentCaptor.forClass(SolicitudOferta.class);
        verify(servicioCorreo).send(captor.capture());
        assertThat(captor.getValue().company()).isEqualTo("Acme Software");
        assertThat(captor.getValue().positionDescription()).isEqualTo("Proyecto de gestión");
        assertThat(captor.getValue().contactEmail()).isEqualTo("laura@acme.com");
    }
}
