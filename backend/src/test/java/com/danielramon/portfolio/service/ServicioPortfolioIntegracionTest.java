package com.danielramon.portfolio.service;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class ServicioPortfolioIntegracionTest {

    @Autowired
    private ServicioPortfolio portfolioService;

    @Test
    void returnsCompletePortfolioSeededFromTheCv() {
        var portfolio = portfolioService.obtenerPortfolio();

        assertThat(portfolio.profile().fullName()).isEqualTo("Daniel Ramón Pérez");
        assertThat(portfolio.experiences()).hasSize(2);
        assertThat(portfolio.experiences().getFirst().company()).isEqualTo("CROS Ingenieros");
        assertThat(portfolio.technologies())
                .extracting("name")
                .containsExactlyInAnyOrder(
                        "Angular", "TypeScript", "JavaScript", "Java",
                        "Spring Boot", "Python", "SQL Server", "WinDev"
                );
        assertThat(portfolio.competencies()).isNotEmpty()
                .allMatch(competencia -> "DERIVED".equals(competencia.evidenceType()));
        assertThat(portfolio.experiences())
                .allSatisfy(experiencia -> {
                    assertThat(experiencia.responsibilities()).isNotEmpty();
                    assertThat(experiencia.technologies())
                            .allMatch(tecnologia -> "EXPLICIT".equals(tecnologia.evidenceType()));
                });
        assertThat(portfolio.education()).hasSize(2);
        assertThat(portfolio.languages()).singleElement()
                .satisfies(idioma -> assertThat(idioma.level()).isEqualTo("B2 First"));
    }

    @Test
    void returnsTheReadOnlyCollectionsUsedByDrpOs() {
        assertThat(portfolioService.obtenerPerfil().linkedInUrl())
                .isEqualTo("https://www.linkedin.com/in/daniel-ramón-pérez");
        assertThat(portfolioService.obtenerExperiencias()).hasSize(2);
        assertThat(portfolioService.obtenerFormacion()).hasSize(2);
        assertThat(portfolioService.obtenerTecnologias()).hasSize(8);
        assertThat(portfolioService.obtenerIdiomas()).singleElement()
                .satisfies(idioma -> assertThat(idioma.issuer()).isEqualTo("Cambridge"));
    }
}
