package com.danielramon.portfolio.dto;

import java.util.List;

public record RespuestaPortfolio(
        PerfilDto profile,
        List<ExperienciaDto> experiences,
        List<TecnologiaDto> technologies,
        List<CompetenciaDto> competencies,
        List<FormacionDto> education,
        List<AcreditacionIdiomaDto> languages
) {
}
