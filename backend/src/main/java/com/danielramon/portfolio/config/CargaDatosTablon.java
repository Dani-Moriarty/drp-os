package com.danielramon.portfolio.config;

import com.danielramon.portfolio.domain.EntidadMensajeTablon;
import com.danielramon.portfolio.repository.RepositorioMensajes;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Component
public class CargaDatosTablon implements CommandLineRunner {

    private static final String ADMIN_MESSAGE = "¡Bienvenido al Message Board! Aquí puedes dejar un mensaje, compartir ideas y comentar sobre proyectos. ¡Gracias por pasarte!";

    private final RepositorioMensajes repository;
    private final Clock clock = Clock.systemUTC();

    public CargaDatosTablon(RepositorioMensajes repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (repository.findFirstByAdministratorTrueOrderByIdAsc().isPresent()) {
            return;
        }
        repository.save(new EntidadMensajeTablon(
                "Daniel Ramón Pérez",
                ADMIN_MESSAGE,
                LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC),
                true
        ));
    }
}
