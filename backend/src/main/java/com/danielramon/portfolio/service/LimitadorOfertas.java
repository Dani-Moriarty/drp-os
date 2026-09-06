package com.danielramon.portfolio.service;

import com.danielramon.portfolio.config.PropiedadesOfertas;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;

@Service
public class LimitadorOfertas {

    private final LimitadorPeticionesEnMemoria delegate;

    @Autowired
    public LimitadorOfertas(PropiedadesOfertas configuracion) {
        this(configuracion.rateLimit(), Clock.systemUTC());
    }

    LimitadorOfertas(PropiedadesOfertas.RateLimit ajustes, Clock reloj) {
        this.delegate = new LimitadorPeticionesEnMemoria(ajustes.maxRequests(), ajustes.window(), reloj);
    }

    public boolean intentarAdquirir(String direccionCliente) {
        return delegate.intentarAdquirir(direccionCliente);
    }
}
