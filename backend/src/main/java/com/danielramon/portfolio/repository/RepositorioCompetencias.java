package com.danielramon.portfolio.repository;

import com.danielramon.portfolio.domain.EntidadCompetencia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepositorioCompetencias extends JpaRepository<EntidadCompetencia, Long> {
    List<EntidadCompetencia> findAllByOrderByCategoryAscNameAsc();
}
