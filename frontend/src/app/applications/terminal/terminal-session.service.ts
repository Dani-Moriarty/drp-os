import { ActividadSistema } from '../../core/system-activity/system-activity.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { resolverUrlApi } from '../../core/config/api.config';
import { Idioma } from '../../core/services/localization.service';
import { DatosPortfolio } from '../../core/models/portfolio.model';
import { URL_CODIGO_FUENTE } from '../../desktop/config/source-code.config';
import { IdAplicacion } from '../../desktop/models/desktop.models';
import { contextoActividad } from '../../core/system-activity/system-activity.context';

type DirectorioVirtual = 'root' | 'experience' | 'education' | 'skills' | 'links';

interface ArchivoVirtual {
  name: string;
  content: string;
  binary?: boolean;
}

export interface ContextoComando {
  portfolio: DatosPortfolio;
  language: Idioma;
}

export interface EntradaTerminal {
  id: number;
  prompt: string;
  command: string;
  output?: string;
  error?: boolean;
}

export type EfectoComando =
  | { type: 'open'; applicationId: IdAplicacion }
  | { type: 'close' }
  | null;

interface ResultadoComando {
  output?: string;
  error?: boolean;
  effect?: Exclude<EfectoComando, null>;
  clear?: boolean;
}

const RUTA_INICIO = 'C:\\Users\\Daniel\\Portfolio';
const RUTAS_API = new Set([
  '/api/portfolio',
  '/api/profile',
  '/api/experiences',
  '/api/technologies',
  '/api/competencies',
  '/api/education',
  '/api/languages',
  '/api/health',
]);

const NOMBRES_DIRECTORIOS: Record<Exclude<DirectorioVirtual, 'root'>, string> = {
  experience: 'experience',
  education: 'education',
  skills: 'skills',
  links: 'links',
};

const ALIAS_DIRECTORIOS: Record<string, Exclude<DirectorioVirtual, 'root'>> = {
  experience: 'experience',
  experiences: 'experience',
  experiencia: 'experience',
  education: 'education',
  educacion: 'education',
  educación: 'education',
  formacion: 'education',
  formación: 'education',
  skills: 'skills',
  skill: 'skills',
  technologies: 'skills',
  tecnologias: 'skills',
  tecnologías: 'skills',
  links: 'links',
  enlaces: 'links',
};

const DESTINOS_APERTURA: Record<string, IdAplicacion> = {
  about: 'about',
  profile: 'about',
  perfil: 'about',
  cv: 'pdf-viewer',
  pdf: 'pdf-viewer',
  linkedin: 'linkedin',
  experience: 'work-experience',
  work: 'work-experience',
  experiencia: 'work-experience',
  education: 'education',
  formacion: 'education',
  formación: 'education',
  source: 'source-code',
  code: 'source-code',
  codigo: 'source-code',
  código: 'source-code',
  hire: 'job-offer',
  contratar: 'job-offer',
  offer: 'job-offer',
  oferta: 'job-offer',
  paint: 'paint',
  dibujo: 'paint',
  solitaire: 'solitaire',
  solitario: 'solitaire',
  minesweeper: 'minesweeper',
  buscaminas: 'minesweeper',
  messageboard: 'message-board',
  message: 'message-board',
  board: 'message-board',
  tablon: 'message-board',
  tablón: 'message-board',
  taskmanager: 'task-manager',
  tasks: 'task-manager',
  tareas: 'task-manager',
  explorer: 'drp-explorer',
  browser: 'drp-explorer',
  navegador: 'drp-explorer',
  reproductor: 'audio-player',
  player: 'audio-player',
  musica: 'music-folder',
  music: 'music-folder',
  recycle: 'recycle-bin',
  trash: 'recycle-bin',
  papelera: 'recycle-bin',
  welcome: 'welcome',
  inicio: 'welcome',
};

@Injectable({ providedIn: 'root' })
export class SesionTerminal {
  private readonly http = inject(HttpClient);
  private readonly activity = inject(ActividadSistema);
  private readonly currentDirectory = signal<DirectorioVirtual>('root');
  private readonly commandHistory = signal<string[]>([]);
  private entrySequence = 0;
  private historyIndex = 0;

  readonly transcript = signal<EntradaTerminal[]>([]);
  readonly input = signal('');
  readonly busy = signal(false);

  prompt(): string {
    return `${this.pathFor(this.currentDirectory())}>`;
  }

  setInput(valor: string): void {
    this.input.set(valor);
  }

  previousHistory(): void {
    const historial = this.commandHistory();
    if (historial.length === 0) {
      return;
    }
    this.historyIndex = Math.max(0, this.historyIndex - 1);
    this.input.set(historial[this.historyIndex] ?? '');
  }

  nextHistory(): void {
    const historial = this.commandHistory();
    if (historial.length === 0) {
      return;
    }
    this.historyIndex = Math.min(historial.length, this.historyIndex + 1);
    this.input.set(this.historyIndex === historial.length ? '' : (historial[this.historyIndex] ?? ''));
  }

  async execute(rawCommand: string, contexto: ContextoComando): Promise<EfectoComando> {
    const comando = rawCommand.trim();
    if (!comando || this.busy()) {
      return null;
    }

    this.activity.pulse('terminal', 'command');
    this.input.set('');
    this.commandHistory.update((historial) => [...historial, comando]);
    this.historyIndex = this.commandHistory().length;

    const entrada: EntradaTerminal = {
      id: ++this.entrySequence,
      prompt: this.prompt(),
      command: comando,
    };
    this.transcript.update((entradas) => [...entradas, entrada]);
    this.busy.set(true);

    try {
      const resultado = await this.dispatch(comando, contexto);
      if (resultado.clear) {
        this.transcript.set([]);
      } else if (resultado.output) {
        this.transcript.update((entradas) =>
          entradas.map((elemento) =>
            elemento.id === entrada.id
              ? { ...elemento, output: resultado.output, error: resultado.error }
              : elemento,
          ),
        );
      }
      return resultado.effect ?? null;
    } finally {
      this.busy.set(false);
    }
  }

  reset(): void {
    this.currentDirectory.set('root');
    this.commandHistory.set([]);
    this.transcript.set([]);
    this.input.set('');
    this.busy.set(false);
    this.entrySequence = 0;
    this.historyIndex = 0;
  }

  private async dispatch(comando: string, contexto: ContextoComando): Promise<ResultadoComando> {
    const tokens = this.tokenize(comando);
    const nombre = tokens[0]?.toLowerCase() ?? '';
    const argumentos = tokens.slice(1);
    const ingles = contexto.language === 'en';

    switch (nombre) {
      case 'help':
        return { output: this.help(ingles) };
      case 'dir':
      case 'ls':
        return { output: this.listDirectory(contexto) };
      case 'cd':
        return this.changeDirectory(argumentos.join(' '), ingles);
      case 'pwd':
        return { output: this.pathFor(this.currentDirectory()) };
      case 'whoami':
        return {
          output: `${contexto.portfolio.profile.fullName} — Full-Stack Developer`,
        };
      case 'hostname':
        return { output: 'DRP-PC' };
      case 'ver':
      case 'uname':
        return { output: this.version(contexto) };
      case 'cls':
      case 'clear':
        return { clear: true };
      case 'type':
      case 'cat':
        return this.readFile(argumentos.join(' '), contexto);
      case 'tree':
        return { output: this.tree(contexto) };
      case 'echo':
        return { output: comando.slice(nombre.length).trimStart() };
      case 'history':
        return { output: this.historyOutput() };
      case 'date':
        return { output: this.currentDate(contexto.language) };
      case 'time':
        return { output: this.currentTime(contexto.language) };
      case 'set':
      case 'env':
        return { output: this.environment(contexto) };
      case 'git':
        return this.git(argumentos, ingles);
      case 'curl':
        return await this.curl(argumentos, ingles);
      case 'start':
      case 'open':
        return this.open(argumentos, ingles);
      case 'exit':
        return { effect: { type: 'close' } };
      default:
        return {
          output: ingles
            ? `'${nombre}' is not recognized. Type help to see the available commands.`
            : `'${nombre}' no se reconoce. Escribe help para ver los comandos disponibles.`,
          error: true,
        };
    }
  }

  private help(ingles: boolean): string {
    return ingles
      ? [
          'Available commands:',
          '  help              Show this command list',
          '  dir | ls          List the current directory',
          '  cd [path]         Change virtual directory',
          '  pwd               Print the current path',
          '  whoami            Show the portfolio owner',
          '  hostname          Show the virtual computer name',
          '  ver | uname       Show the portfolio workstation version',
          '  cls | clear       Clear the console',
          '  type | cat FILE   Read a virtual text file',
          '  tree              Show the complete file tree',
          '  echo TEXT         Print text',
          '  history           Show this session command history',
          '  date | time       Show browser date or time',
          '  set | env         Show public virtual variables',
          '  git status | log  Show public repository information',
          '  curl /api/...     Query a public portfolio endpoint',
          '  start | open ITEM Open a desktop item',
          '  exit              Close Terminal',
        ].join('\n')
      : [
          'Comandos disponibles:',
          '  help              Mostrar esta lista',
          '  dir | ls          Listar el directorio actual',
          '  cd [ruta]         Cambiar de directorio virtual',
          '  pwd               Mostrar la ruta actual',
          '  whoami            Mostrar el propietario del portfolio',
          '  hostname          Mostrar el nombre del equipo virtual',
          '  ver | uname       Mostrar la versión de la workstation',
          '  cls | clear       Limpiar la consola',
          '  type | cat ARCHIVO Leer un archivo de texto virtual',
          '  tree              Mostrar el árbol de archivos completo',
          '  echo TEXTO        Devolver texto',
          '  history           Mostrar el historial de esta sesión',
          '  date | time       Mostrar la fecha o la hora del navegador',
          '  set | env         Mostrar variables virtuales públicas',
          '  git status | log  Mostrar información pública del repositorio',
          '  curl /api/...     Consultar un endpoint público del portfolio',
          '  start | open ITEM Abrir un elemento del escritorio',
          '  exit              Cerrar Terminal',
        ].join('\n');
  }

  private listDirectory(contexto: ContextoComando): string {
    const directorio = this.currentDirectory();
    const directorios = directorio === 'root' ? Object.values(NOMBRES_DIRECTORIOS) : [];
    const archivos = this.filesFor(directorio, contexto);
    const lineas = [
      `${contexto.language === 'en' ? 'Directory of' : 'Directorio de'} ${this.pathFor(directorio)}`,
      '',
      ...directorios.map((nombre) => `<DIR>          ${nombre}`),
      ...archivos.map((archivo) => `${archivo.binary ? '<BIN>' : '     '}          ${archivo.name}`),
      '',
      `${directorios.length} ${contexto.language === 'en' ? 'folder(s)' : 'carpeta(s)'}, ${archivos.length} ${contexto.language === 'en' ? 'file(s)' : 'archivo(s)'}`,
    ];
    return lineas.join('\n');
  }

  private changeDirectory(argumento: string, ingles: boolean): ResultadoComando {
    const destino = argumento.trim() || RUTA_INICIO;
    const resuelto = this.resolveDirectory(destino);
    if (!resuelto) {
      return {
        output: ingles
          ? `The system cannot find the path: ${destino}`
          : `El sistema no puede encontrar la ruta: ${destino}`,
        error: true,
      };
    }
    this.currentDirectory.set(resuelto);
    return {};
  }

  private readFile(argumento: string, contexto: ContextoComando): ResultadoComando {
    if (!argumento.trim()) {
      return {
        output: contexto.language === 'en' ? 'Usage: type FILE' : 'Uso: type ARCHIVO',
        error: true,
      };
    }

    const resuelto = this.resolveFile(argumento, contexto);
    if (!resuelto) {
      return {
        output:
          contexto.language === 'en'
            ? `File not found: ${argumento}`
            : `No se encuentra el archivo: ${argumento}`,
        error: true,
      };
    }
    if (resuelto.binary) {
      return {
        output:
          contexto.language === 'en'
            ? `${resuelto.name} is a binary file. Use start cv to open it.`
            : `${resuelto.name} es un archivo binario. Usa start cv para abrirlo.`,
      };
    }
    return { output: resuelto.content };
  }

  private tree(contexto: ContextoComando): string {
    const branch = (last: boolean) => (last ? '└── ' : '├── ');
    const lineas = ['Portfolio', `${branch(false)}about.txt`, `${branch(false)}cv.pdf`];
    const directorios = Object.keys(NOMBRES_DIRECTORIOS) as Exclude<DirectorioVirtual, 'root'>[];
    directorios.forEach((directorio, directoryIndex) => {
      const lastDirectory = directoryIndex === directorios.length - 1;
      lineas.push(`${branch(lastDirectory)}${NOMBRES_DIRECTORIOS[directorio]}`);
      const archivos = this.filesFor(directorio, contexto);
      archivos.forEach((archivo, fileIndex) => {
        const prefijo = lastDirectory ? '    ' : '│   ';
        lineas.push(`${prefijo}${branch(fileIndex === archivos.length - 1)}${archivo.name}`);
      });
    });
    return lineas.join('\n');
  }

  private version(contexto: ContextoComando): string {
    const preferido = ['Angular', 'TypeScript', 'Java', 'Spring Boot', 'SQL Server'];
    const technologies = preferido.filter((nombre) =>
      contexto.portfolio.technologies.some((tecnologia) => tecnologia.name === nombre),
    );
    return `DRP OS v1.0\n${technologies.join(' · ')}`;
  }

  private historyOutput(): string {
    return this.commandHistory()
      .map((comando, indice) => `${String(indice + 1).padStart(3, ' ')}  ${comando}`)
      .join('\n');
  }

  private currentDate(idioma: Idioma): string {
    return new Intl.DateTimeFormat(idioma === 'en' ? 'en-GB' : 'es-ES', {
      dateStyle: 'full',
    }).format(new Date());
  }

  private currentTime(idioma: Idioma): string {
    return new Intl.DateTimeFormat(idioma === 'en' ? 'en-GB' : 'es-ES', {
      timeStyle: 'medium',
    }).format(new Date());
  }

  private environment(contexto: ContextoComando): string {
    const valores = {
      API_BASE: '/api',
      HOME: RUTA_INICIO,
      LANG: contexto.language === 'en' ? 'en_GB.UTF-8' : 'es_ES.UTF-8',
      PORTFOLIO_MODE: 'PUBLIC_READ_ONLY',
      PORTFOLIO_OWNER: contexto.portfolio.profile.fullName,
      ROLE: contexto.portfolio.profile.headline,
      SHELL: 'portfolio-terminal',
    };
    return Object.entries(valores)
      .map(([name, value]) => `${name}=${value}`)
      .join('\n');
  }

  private git(argumentos: string[], ingles: boolean): ResultadoComando {
    const subcommand = argumentos[0]?.toLowerCase();
    if (subcommand === 'status') {
      return {
        output: [
          'On branch portfolio',
          ingles ? 'Portfolio data source: read-only API' : 'Fuente de datos: API de solo lectura',
          URL_CODIGO_FUENTE
            ? `${ingles ? 'Public repository' : 'Repositorio público'}: ${URL_CODIGO_FUENTE}`
            : ingles
              ? 'Public repository: not configured'
              : 'Repositorio público: no configurado',
        ].join('\n'),
      };
    }
    if (subcommand === 'log') {
      return {
        output: URL_CODIGO_FUENTE
          ? ingles
            ? `Public history is available at ${URL_CODIGO_FUENTE}`
            : `El historial público está disponible en ${URL_CODIGO_FUENTE}`
          : ingles
            ? 'No public commit history is configured yet.'
            : 'Todavía no hay un historial público de commits configurado.',
      };
    }
    return {
      output: ingles ? 'Usage: git status | git log' : 'Uso: git status | git log',
      error: true,
    };
  }

  private async curl(argumentos: string[], ingles: boolean): Promise<ResultadoComando> {
    const endpoint = argumentos[0];
    if (!endpoint || !RUTAS_API.has(endpoint)) {
      return {
        output: ingles
          ? `Allowed endpoints:\n${[...RUTAS_API].join('\n')}`
          : `Endpoints permitidos:\n${[...RUTAS_API].join('\n')}`,
        error: true,
      };
    }

    const requestUrl = resolverUrlApi(endpoint as `/api/${string}`);
    if (!requestUrl) {
      return {
        output: ingles
          ? 'NETWORK_ERROR: the public backend is not configured or available.'
          : 'NETWORK_ERROR: el backend público no está configurado o disponible.',
        error: true,
      };
    }

    try {
      const respuesta = await firstValueFrom(
        this.http.get<unknown>(requestUrl, { context: contextoActividad('terminal') }),
      );
      return { output: JSON.stringify(respuesta, null, 2) };
    } catch (error) {
      const estado = error instanceof HttpErrorResponse ? `HTTP ${error.status}` : 'NETWORK_ERROR';
      return {
        output: ingles
          ? `${estado}: unable to query ${endpoint}`
          : `${estado}: no se ha podido consultar ${endpoint}`,
        error: true,
      };
    }
  }

  private open(argumentos: string[], ingles: boolean): ResultadoComando {
    const destino = argumentos[0]?.toLowerCase();
    const idAplicacion = destino ? DESTINOS_APERTURA[destino] : undefined;
    if (!idAplicacion) {
      return {
        output: ingles
          ? 'Usage: start cv | linkedin | experience | education | about | source | hire | paint | solitaire | minesweeper | recycle | welcome'
          : 'Uso: start cv | linkedin | experiencia | formacion | about | source | contratar | papelera | inicio',
        error: true,
      };
    }
    return {
      output: `${ingles ? 'Opening' : 'Abriendo'} ${destino}...`,
      effect: { type: 'open', applicationId: idAplicacion },
    };
  }

  private pathFor(directorio: DirectorioVirtual): string {
    return directorio === 'root' ? RUTA_INICIO : `${RUTA_INICIO}\\${NOMBRES_DIRECTORIOS[directorio]}`;
  }

  private resolveDirectory(entrada: string): DirectorioVirtual | null {
    const normalizado = entrada.trim().replaceAll('/', '\\').replace(/^"|"$/gu, '');
    if (!normalizado || normalizado === '.' || normalizado.toLowerCase() === RUTA_INICIO.toLowerCase()) {
      return normalizado.toLowerCase() === RUTA_INICIO.toLowerCase() ? 'root' : this.currentDirectory();
    }
    if (normalizado === '\\' || normalizado === '~') {
      return 'root';
    }

    const absolute = normalizado.toLowerCase().startsWith(RUTA_INICIO.toLowerCase());
    const restante = absolute ? normalizado.slice(RUTA_INICIO.length) : normalizado;
    const segments = restante.split('\\').filter(Boolean);
    let directorio: DirectorioVirtual = absolute ? 'root' : this.currentDirectory();

    for (const segment of segments) {
      const valor = segment.toLowerCase();
      if (valor === '.') {
        continue;
      }
      if (valor === '..') {
        directorio = 'root';
        continue;
      }
      const resuelto = ALIAS_DIRECTORIOS[valor];
      if (directorio !== 'root' || !resuelto) {
        return null;
      }
      directorio = resuelto;
    }
    return directorio;
  }

  private resolveFile(entrada: string, contexto: ContextoComando): ArchivoVirtual | null {
    const normalizado = entrada.trim().replaceAll('/', '\\').replace(/^"|"$/gu, '');
    const separatorIndex = normalizado.lastIndexOf('\\');
    const directoryInput = separatorIndex >= 0 ? normalizado.slice(0, separatorIndex) : '';
    const nombreArchivo = separatorIndex >= 0 ? normalizado.slice(separatorIndex + 1) : normalizado;
    const directorio = directoryInput
      ? this.resolveDirectory(directoryInput)
      : this.currentDirectory();
    if (!directorio) {
      return null;
    }
    return (
      this.filesFor(directorio, contexto).find(
        (archivo) => archivo.name.toLowerCase() === nombreArchivo.toLowerCase(),
      ) ?? null
    );
  }

  private filesFor(directorio: DirectorioVirtual, contexto: ContextoComando): ArchivoVirtual[] {
    const { portfolio, language } = contexto;
    const ingles = language === 'en';
    switch (directorio) {
      case 'root':
        return [
          {
            name: 'about.txt',
            content: [
              portfolio.profile.fullName,
              portfolio.profile.headline,
              portfolio.profile.location,
              '',
              portfolio.profile.summary,
            ].join('\n'),
          },
          { name: 'cv.pdf', content: '', binary: true },
        ];
      case 'experience':
        return portfolio.experiences.map((experiencia) => ({
          name: `${experiencia.company.replaceAll(' ', '_')}.txt`,
          content: [
            `${experiencia.role} — ${experiencia.company}`,
            `${experiencia.startDate} - ${experiencia.endDate}`,
            '',
            experiencia.context,
            '',
            ingles ? 'RESPONSIBILITIES' : 'RESPONSABILIDADES',
            ...experiencia.responsibilities.map((responsabilidad) => `- ${responsabilidad}`),
            '',
            ingles ? 'TECHNOLOGIES' : 'TECNOLOGÍAS',
            experiencia.technologies.map((tecnologia) => tecnologia.name).join(', '),
          ].join('\n'),
        }));
      case 'education':
        return [
          {
            name: 'Education.txt',
            content: portfolio.education
              .map(
                (formacion) =>
                  `${formacion.qualification} — ${formacion.institution} (${formacion.startYear}-${formacion.endYear})`,
              )
              .join('\n'),
          },
          {
            name: 'Languages.txt',
            content: portfolio.languages
              .map(
                (qualification) =>
                  `${qualification.language}: ${qualification.level} — ${qualification.issuer}`,
              )
              .join('\n'),
          },
        ];
      case 'skills':
        return [
          {
            name: 'Technologies.txt',
            content: portfolio.technologies.map((tecnologia) => tecnologia.name).join('\n'),
          },
          {
            name: 'Competencies.txt',
            content: portfolio.competencies
              .map((competencia) => `${competencia.name}\n  ${competencia.evidence}`)
              .join('\n\n'),
          },
        ];
      case 'links':
        return [
          { name: 'LinkedIn.url', content: portfolio.profile.linkedInUrl },
          {
            name: 'Source_Code.url',
            content:
              URL_CODIGO_FUENTE ??
              (ingles ? 'Public repository not configured.' : 'Repositorio público no configurado.'),
          },
        ];
    }
  }

  private tokenize(comando: string): string[] {
    const tokens: string[] = [];
    const pattern = /"([^"]*)"|'([^']*)'|(\S+)/gu;
    for (const coincidencia of comando.matchAll(pattern)) {
      tokens.push(coincidencia[1] ?? coincidencia[2] ?? coincidencia[3]);
    }
    return tokens;
  }
}
