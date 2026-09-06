package com.danielramon.portfolio.repository;

import com.danielramon.portfolio.domain.EntidadTecnologia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepositorioTecnologias extends JpaRepository<EntidadTecnologia, Long> {
    List<EntidadTecnologia> findAllByOrderByCategoryAscNameAsc();
}
