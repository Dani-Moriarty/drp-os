package com.danielramon.portfolio.dto;

import com.danielramon.portfolio.domain.CategoriaCompetencia;

public record CompetenciaDto(
        Long id,
        String name,
        CategoriaCompetencia category,
        String evidence,
        String evidenceType
) {
}
