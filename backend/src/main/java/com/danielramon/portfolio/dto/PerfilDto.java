package com.danielramon.portfolio.dto;

public record PerfilDto(
        String fullName,
        String headline,
        String location,
        String phone,
        String email,
        String linkedInUrl,
        String summary
) {
}
