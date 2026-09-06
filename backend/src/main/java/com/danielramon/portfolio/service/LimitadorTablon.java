package com.danielramon.portfolio.service;

import com.danielramon.portfolio.config.PropiedadesTablon;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;

@Service
public class LimitadorTablon {

    private final LimitadorPeticionesEnMemoria delegate;

    @Autowired
    public LimitadorTablon(PropiedadesTablon configuracion) {
        this(configuracion, Clock.systemUTC());
    }

    LimitadorTablon(PropiedadesTablon configuracion, Clock reloj) {
        this.delegate = new LimitadorPeticionesEnMemoria(
                configuracion.rateLimit().maxRequests(),
                configuracion.rateLimit().window(),
                reloj
        );
    }

    public boolean intentarAdquirir(String direccionCliente) {
        return delegate.intentarAdquirir(direccionCliente);
    }
}
