package com.danielramon.portfolio.repository;

import com.danielramon.portfolio.domain.EntidadAcreditacionIdioma;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RepositorioIdiomas extends JpaRepository<EntidadAcreditacionIdioma, Long> {
    List<EntidadAcreditacionIdioma> findAllByOrderByDisplayOrderAsc();
}
