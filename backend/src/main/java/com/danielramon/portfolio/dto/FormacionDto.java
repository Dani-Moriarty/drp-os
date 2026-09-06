package com.danielramon.portfolio.dto;

public record FormacionDto(
        Long id,
        String qualification,
        String institution,
        int startYear,
        int endYear
) {
}
