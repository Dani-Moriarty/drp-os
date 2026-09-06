package com.danielramon.portfolio.controller;

import com.danielramon.portfolio.dto.CompetenciaDto;
import com.danielramon.portfolio.dto.FormacionDto;
import com.danielramon.portfolio.dto.ExperienciaDto;
import com.danielramon.portfolio.dto.RespuestaPortfolio;
import com.danielramon.portfolio.dto.PerfilDto;
import com.danielramon.portfolio.dto.TecnologiaDto;
import com.danielramon.portfolio.dto.AcreditacionIdiomaDto;
import com.danielramon.portfolio.service.ServicioPortfolio;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ControladorPortfolio {

    private final ServicioPortfolio portfolioService;

    public ControladorPortfolio(ServicioPortfolio portfolioService) {
        this.portfolioService = portfolioService;
    }

    @GetMapping("/portfolio")
    public RespuestaPortfolio getPortfolio() {
        return portfolioService.obtenerPortfolio();
    }

    @GetMapping("/profile")
    public PerfilDto getProfile() {
        return portfolioService.obtenerPerfil();
    }

    @GetMapping("/experiences")
    public List<ExperienciaDto> getExperiences() {
        return portfolioService.obtenerExperiencias();
    }

    @GetMapping("/technologies")
    public List<TecnologiaDto> getTechnologies() {
        return portfolioService.obtenerTecnologias();
    }

    @GetMapping("/competencies")
    public List<CompetenciaDto> getCompetencies() {
        return portfolioService.obtenerCompetencias();
    }

    @GetMapping("/education")
    public List<FormacionDto> getEducation() {
        return portfolioService.obtenerFormacion();
    }

    @GetMapping("/languages")
    public List<AcreditacionIdiomaDto> getLanguages() {
        return portfolioService.obtenerIdiomas();
    }
}
