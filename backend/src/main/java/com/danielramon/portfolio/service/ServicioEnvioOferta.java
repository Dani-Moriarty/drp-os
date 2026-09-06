package com.danielramon.portfolio.service;

import com.danielramon.portfolio.dto.SolicitudOferta;
import org.springframework.stereotype.Service;

@Service
public class ServicioEnvioOferta {

    private final ServicioCorreoOferta servicioCorreo;

    public ServicioEnvioOferta(ServicioCorreoOferta servicioCorreo) {
        this.servicioCorreo = servicioCorreo;
    }

    public void submit(SolicitudOferta solicitud) {
        servicioCorreo.send(solicitud.normalized());
    }
}
