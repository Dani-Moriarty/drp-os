package com.danielramon.portfolio.repository;

import com.danielramon.portfolio.domain.EntidadPerfil;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RepositorioPerfil extends JpaRepository<EntidadPerfil, Long> {
    Optional<EntidadPerfil> findFirstByOrderByIdAsc();
}
