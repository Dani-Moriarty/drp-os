package com.danielramon.portfolio.dto;

import com.danielramon.portfolio.domain.CategoriaTecnologia;

public record TecnologiaDto(
        Long id,
        String name,
        CategoriaTecnologia category,
        String evidenceType
) {
}
