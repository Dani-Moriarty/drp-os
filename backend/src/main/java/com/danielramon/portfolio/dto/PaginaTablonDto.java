package com.danielramon.portfolio.dto;

import java.util.List;

public record PaginaTablonDto(
        List<MensajeTablonDto> messages,
        int page,
        int totalPages,
        long totalMessages,
        boolean hasOlder,
        boolean hasNewer
) {
}
