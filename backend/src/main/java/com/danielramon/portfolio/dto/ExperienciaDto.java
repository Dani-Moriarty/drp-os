package com.danielramon.portfolio.dto;

import java.time.LocalDate;
import java.util.List;

public record ExperienciaDto(
        Long id,
        String role,
        String company,
        LocalDate startDate,
        LocalDate endDate,
        String context,
        List<String> responsibilities,
        List<TecnologiaDto> technologies,
        List<CompetenciaDto> competencies
) {
}
