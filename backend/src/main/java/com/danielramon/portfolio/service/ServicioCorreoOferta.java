package com.danielramon.portfolio.service;

import com.danielramon.portfolio.dto.SolicitudOferta;

public interface ServicioCorreoOferta {
    void send(SolicitudOferta solicitud);
}
