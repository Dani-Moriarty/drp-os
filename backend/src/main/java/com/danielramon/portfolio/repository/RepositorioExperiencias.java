package com.danielramon.portfolio.repository;

import com.danielramon.portfolio.domain.EntidadExperiencia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepositorioExperiencias extends JpaRepository<EntidadExperiencia, Long> {
    List<EntidadExperiencia> findAllByOrderByStartDateDesc();
}
