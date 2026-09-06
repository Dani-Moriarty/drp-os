package com.danielramon.portfolio.service;

import com.danielramon.portfolio.domain.EntidadCompetencia;
import com.danielramon.portfolio.domain.EntidadFormacion;
import com.danielramon.portfolio.domain.EntidadExperiencia;
import com.danielramon.portfolio.domain.EntidadAcreditacionIdioma;
import com.danielramon.portfolio.domain.EntidadPerfil;
import com.danielramon.portfolio.domain.EntidadTecnologia;
import com.danielramon.portfolio.dto.CompetenciaDto;
import com.danielramon.portfolio.dto.FormacionDto;
import com.danielramon.portfolio.dto.ExperienciaDto;
import com.danielramon.portfolio.dto.AcreditacionIdiomaDto;
import com.danielramon.portfolio.dto.RespuestaPortfolio;
import com.danielramon.portfolio.dto.PerfilDto;
import com.danielramon.portfolio.dto.TecnologiaDto;
import com.danielramon.portfolio.repository.RepositorioCompetencias;
import com.danielramon.portfolio.repository.RepositorioFormacion;
import com.danielramon.portfolio.repository.RepositorioExperiencias;
import com.danielramon.portfolio.repository.RepositorioIdiomas;
import com.danielramon.portfolio.repository.RepositorioPerfil;
import com.danielramon.portfolio.repository.RepositorioTecnologias;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ServicioPortfolio {

    private final RepositorioPerfil repositorioPerfil;
    private final RepositorioExperiencias repositorioExperiencias;
    private final RepositorioTecnologias repositorioTecnologias;
    private final RepositorioCompetencias repositorioCompetencias;
    private final RepositorioFormacion repositorioFormacion;
    private final RepositorioIdiomas repositorioIdiomas;

    public ServicioPortfolio(
            RepositorioPerfil repositorioPerfil,
            RepositorioExperiencias repositorioExperiencias,
            RepositorioTecnologias repositorioTecnologias,
            RepositorioCompetencias repositorioCompetencias,
            RepositorioFormacion repositorioFormacion,
            RepositorioIdiomas repositorioIdiomas
    ) {
        this.repositorioPerfil = repositorioPerfil;
        this.repositorioExperiencias = repositorioExperiencias;
        this.repositorioTecnologias = repositorioTecnologias;
        this.repositorioCompetencias = repositorioCompetencias;
        this.repositorioFormacion = repositorioFormacion;
        this.repositorioIdiomas = repositorioIdiomas;
    }

    public RespuestaPortfolio obtenerPortfolio() {
        return new RespuestaPortfolio(
                obtenerPerfil(),
                obtenerExperiencias(),
                obtenerTecnologias(),
                obtenerCompetencias(),
                obtenerFormacion(),
                obtenerIdiomas()
        );
    }

    public PerfilDto obtenerPerfil() {
        return repositorioPerfil.findFirstByOrderByIdAsc()
                .map(this::convertirPerfil)
                .orElseThrow(PortfolioNoEncontrado::new);
    }

    public List<ExperienciaDto> obtenerExperiencias() {
        return repositorioExperiencias.findAllByOrderByStartDateDesc().stream()
                .map(this::convertirExperiencia)
                .toList();
    }

    public List<TecnologiaDto> obtenerTecnologias() {
        return repositorioTecnologias.findAllByOrderByCategoryAscNameAsc().stream()
                .map(this::convertirTecnologia)
                .toList();
    }

    public List<CompetenciaDto> obtenerCompetencias() {
        return repositorioCompetencias.findAllByOrderByCategoryAscNameAsc().stream()
                .map(this::convertirCompetencia)
                .toList();
    }

    public List<FormacionDto> obtenerFormacion() {
        return repositorioFormacion.findAllByOrderByStartYearDesc().stream()
                .map(this::convertirFormacion)
                .toList();
    }

    public List<AcreditacionIdiomaDto> obtenerIdiomas() {
        return repositorioIdiomas.findAllByOrderByDisplayOrderAsc().stream()
                .map(this::convertirIdioma)
                .toList();
    }

    private PerfilDto convertirPerfil(EntidadPerfil perfil) {
        return new PerfilDto(
                perfil.getFullName(),
                perfil.getHeadline(),
                perfil.getLocation(),
                perfil.getPhone(),
                perfil.getEmail(),
                perfil.getLinkedInUrl(),
                perfil.getSummary()
        );
    }

    private ExperienciaDto convertirExperiencia(EntidadExperiencia experiencia) {
        var technologies = experiencia.getTechnologies().stream()
                .sorted(Comparator.comparing(EntidadTecnologia::getCategory).thenComparing(EntidadTecnologia::getName))
                .map(this::convertirTecnologia)
                .toList();
        var competencies = experiencia.getCompetencies().stream()
                .sorted(Comparator.comparing(EntidadCompetencia::getCategory).thenComparing(EntidadCompetencia::getName))
                .map(this::convertirCompetencia)
                .toList();

        return new ExperienciaDto(
                experiencia.getId(),
                experiencia.getRole(),
                experiencia.getCompany(),
                experiencia.getStartDate(),
                experiencia.getEndDate(),
                experiencia.getContext(),
                experiencia.getResponsibilities().stream().map(item -> item.getDescription()).toList(),
                technologies,
                competencies
        );
    }

    private TecnologiaDto convertirTecnologia(EntidadTecnologia tecnologia) {
        return new TecnologiaDto(tecnologia.getId(), tecnologia.getName(), tecnologia.getCategory(), "EXPLICIT");
    }

    private CompetenciaDto convertirCompetencia(EntidadCompetencia competencia) {
        return new CompetenciaDto(
                competencia.getId(),
                competencia.getName(),
                competencia.getCategory(),
                competencia.getEvidence(),
                "DERIVED"
        );
    }

    private FormacionDto convertirFormacion(EntidadFormacion formacion) {
        return new FormacionDto(
                formacion.getId(),
                formacion.getQualification(),
                formacion.getInstitution(),
                formacion.getStartYear(),
                formacion.getEndYear()
        );
    }

    private AcreditacionIdiomaDto convertirIdioma(EntidadAcreditacionIdioma idioma) {
        return new AcreditacionIdiomaDto(
                idioma.getId(),
                idioma.getLanguage(),
                idioma.getLevel(),
                idioma.getIssuer()
        );
    }
}
