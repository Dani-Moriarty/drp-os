package com.danielramon.portfolio.repository;

import com.danielramon.portfolio.domain.EntidadFormacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepositorioFormacion extends JpaRepository<EntidadFormacion, Long> {
    List<EntidadFormacion> findAllByOrderByStartYearDesc();
}
