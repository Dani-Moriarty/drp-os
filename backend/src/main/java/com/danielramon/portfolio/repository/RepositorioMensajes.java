package com.danielramon.portfolio.repository;

import com.danielramon.portfolio.domain.EntidadMensajeTablon;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RepositorioMensajes extends JpaRepository<EntidadMensajeTablon, Long> {
    Optional<EntidadMensajeTablon> findFirstByAdministratorTrueOrderByIdAsc();

    Page<EntidadMensajeTablon> findAllByIdNot(Long id, Pageable pageable);
}
