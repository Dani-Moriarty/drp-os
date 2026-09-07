from __future__ import annotations

import html
import json
import re
import subprocess
import sys
from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image as PdfImage,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


RAIZ = Path(__file__).resolve().parents[2]
DIR_ARQ = RAIZ / "docs" / "arquitectura"
DIR_FUENTES = DIR_ARQ / "fuentes"
DIR_RENDER = DIR_ARQ / "renderizados"
BASE_MD = DIR_ARQ / "documentacion_base.md"
FINAL_MD = RAIZ / "docs" / "DOCUMENTACION_TECNICA_DRP_OS.md"
FINAL_PDF = RAIZ / "docs" / "DOCUMENTACION_TECNICA_DRP_OS.pdf"


DIAGRAMAS = [
    {
        "id": "01-mapa-maestro",
        "titulo": "Mapa maestro de DRP OS",
        "columnas": [
            ["Visitante", "Navegador\nDRP OS"],
            ["Cloudflare DNS / TLS", "Cloudflare Pages\nAngular estático", "Cloudflare Tunnel\nAPI pública"],
            ["Snapshot JSON + assets", "Spring Boot\n127.0.0.1:8080"],
            ["SQL Server Express\n127.0.0.1:1433", "Resend SMTP"],
        ],
        "flujos": ["HTTPS", "estáticos", "REST / JSON", "JPA / JDBC", "SMTP"],
    },
    {
        "id": "02-ejecucion-hosting",
        "titulo": "Dónde se ejecuta cada componente",
        "columnas": [
            ["PC del visitante\nAngular + estado + localStorage", "APIs del navegador\nCanvas, Audio, iframe, Performance"],
            ["Edge Cloudflare\nDNS, TLS, Pages, proxy Tunnel"],
            ["PC de Daniel\ncloudflared + Java 21", "Docker Desktop\nSQL Server 2022 Express"],
            ["Resend\nservidor SMTP", "GitHub\nrepositorio canónico"],
        ],
        "flujos": ["descarga", "peticiones", "conexión saliente", "correo / código"],
    },
    {
        "id": "03-carga-inicial",
        "titulo": "Secuencia real de carga inicial",
        "columnas": [
            ["Usuario\nabre dominio"],
            ["Cloudflare Pages\nentrega index + hashes"],
            ["main.ts\nbootstrapApplication"],
            ["Aplicacion\nobserveResources + cargarPortfolio"],
            ["GET /data/portfolio.json\nNO usa Spring Boot"],
            ["Escritorio\nregistra CV + Welcome"],
        ],
        "flujos": ["1", "2", "3", "4", "5"],
    },
    {
        "id": "04-arquitectura-frontend",
        "titulo": "Arquitectura del frontend Angular",
        "columnas": [
            ["Aplicacion\nraíz, carga snapshot"],
            ["Escritorio\nshell y orquestación", "Componentes desktop\nventana, icono, taskbar, Start"],
            ["GestorVentanas", "SistemaArchivosEscritorio", "DistribucionEscritorio"],
            ["20 carpetas de aplicaciones", "Servicios core\nAPI, idioma, descargas, actividad"],
            ["Browser APIs\nDOM, Pointer, Canvas, Audio, Storage"],
        ],
        "flujos": ["inputs", "signals", "registro", "adaptadores"],
    },
    {
        "id": "05-ciclo-ventana",
        "titulo": "Estados y transiciones de una ventana",
        "columnas": [
            ["No abierta"],
            ["Abierta + enfocada"],
            ["Movida / redimensionada", "Maximizada"],
            ["Minimizada"],
            ["Cerrada"],
        ],
        "flujos": ["abrir", "mover / maximizar", "minimizar / restaurar", "cerrar"],
    },
    {
        "id": "06-sistema-archivos",
        "titulo": "Sistema de archivos virtual y asociaciones",
        "columnas": [
            ["Escritorio"],
            ["Experiencia", "Música", "Álbum", "Carpetas usuario"],
            ["TXT", "PNG usuario", "M4A", "Fotos PNG", "Aplicaciones"],
            ["Notepad", "Visor imagen", "Reproductor", "Ventana app"],
            ["Papelera\nrestaurar / borrar"],
        ],
        "flujos": ["mover", "resolver entrada", "abrir asociación", "eliminar"],
    },
    {
        "id": "07-persistencia",
        "titulo": "Arquitectura de persistencia",
        "columnas": [
            ["Memoria Angular\nventanas, juegos, sesiones"],
            ["localStorage\nlayout v3, filesystem v6, idioma, autor, audio"],
            ["Cookie HttpOnly\nsesión admin firmada"],
            ["SQL Server\nportfolio + Message Board"],
            ["No persistido\nofertas: se envían y descartan"],
        ],
        "flujos": ["recarga", "sesión", "servidor", "SMTP"],
    },
    {
        "id": "08-arquitectura-backend",
        "titulo": "Arquitectura del backend Spring Boot",
        "columnas": [
            ["FiltroSeguridadApi", "ConfiguracionWebCors"],
            ["5 controladores\n16 combinaciones método/ruta"],
            ["Servicios\nportfolio, tablón, ofertas, sesión, límites"],
            ["7 repositorios Spring Data"],
            ["10 entidades / enums\nSQL Server", "JavaMailSender\nSMTP"],
        ],
        "flujos": ["filtrar", "validar DTO", "transacción", "JPA / SMTP"],
    },
    {
        "id": "09-modelo-datos",
        "titulo": "Modelo lógico de datos",
        "columnas": [
            ["profiles (1)", "education (2)", "language_qualifications (1)"],
            ["experiences (2)"],
            ["experience_responsibilities (6)", "experience_technologies (9)", "experience_competencies (12)"],
            ["technologies (8)", "competencies (12)"],
            ["message_board_messages (2 observados)"],
        ],
        "flujos": ["1:N", "tablas puente", "N:M", "independiente"],
    },
    {
        "id": "10-comunicacion-capas",
        "titulo": "Canales de comunicación reales",
        "columnas": [
            ["Eventos DOM / Pointer / teclado", "Drag dataTransfer"],
            ["Signals + outputs Angular", "Adaptador Paint ↔ filesystem"],
            ["HttpClient REST JSON", "iframe sandbox / YouTube nocookie"],
            ["Cloudflare Tunnel HTTP", "JDBC", "SMTP"],
        ],
        "flujos": ["local", "intraapp", "red", "servidor"],
    },
    {
        "id": "11-infraestructura",
        "titulo": "Infraestructura pública y local",
        "columnas": [
            ["danielramonperez.com\nwww"],
            ["Cloudflare Pages\nCNAME + TLS", "api.danielramonperez.com\nTunnel"],
            ["Servicio Windows cloudflared\nautomático", "Startup de sesión\nPowerShell"],
            ["Spring JAR\nloopback", "Docker SQL Express\nloopback"],
            ["Volumen Express", "Volumen Developer preservado", "Backups .bak fuera de Git"],
        ],
        "flujos": ["HTTPS", "túnel saliente", "arranque", "persistencia"],
    },
    {
        "id": "12-despliegue",
        "titulo": "Flujo de cambio, build y despliegue",
        "columnas": [
            ["Cambio local"],
            ["lint + 154 tests\nAngular build", "44 tests\nMaven package"],
            ["commit + push\nmain"],
            ["Cloudflare Pages\nbuild automático frontend"],
            ["Backend local\nJAR manual / startup"],
            ["Cloudflare Tunnel\nexpone API"],
        ],
        "flujos": ["validar", "publicar Git", "deploy estático", "operación separada", "API"],
    },
    {
        "id": "13-stack",
        "titulo": "Stack tecnológico real por responsabilidad",
        "columnas": [
            ["TypeScript 6\nHTML + SCSS"],
            ["Angular 22\nRxJS 7.8\nSignals"],
            ["Java 21\nSpring Boot 4.1\nTomcat 11"],
            ["Hibernate / JPA\nSQL Server JDBC"],
            ["SQL Server 2022 Express\nDocker Compose"],
            ["Cloudflare Pages / Tunnel\nResend SMTP\nGitHub"],
        ],
        "flujos": ["compila", "UI", "API", "datos", "infra"],
    },
    {
        "id": "14-mapa-aplicaciones",
        "titulo": "Mapa de aplicaciones y capacidades",
        "columnas": [
            ["CV\nWelcome, Sobre mí, Experiencia, Formación, PDF"],
            ["Sistema\nTerminal, Task Manager, Papelera"],
            ["Creación\nPaint, TXT, carpetas, visor"],
            ["Juegos\nSolitario, Buscaminas"],
            ["Red\nContratar, Message Board, DRP Explorer"],
            ["Media\nReproductor, Música, Álbum"],
        ],
        "flujos": ["registro único", "filesystem", "ventanas", "servicios"],
    },
    {
        "id": "15-dependencias",
        "titulo": "Mapa de dependencias simplificado",
        "columnas": [
            ["desktop-applications.ts\nmetadatos"],
            ["Escritorio"],
            ["GestorVentanas", "SistemaArchivos", "Localizacion", "ActividadSistema"],
            ["Aplicaciones"],
            ["Servicios HTTP", "Browser APIs"],
            ["Spring API", "SQL / SMTP"],
        ],
        "flujos": ["configura", "orquesta", "inyecta", "consume", "comunica"],
    },
    {
        "id": "16-flujo-oferta",
        "titulo": "Secuencia de Contratar",
        "columnas": [
            ["Recruiter\nrellena formulario"],
            ["FormularioOferta\nvalidación + honeypot"],
            ["ServicioOfertas\nPOST JSON"],
            ["ControladorOfertas\nvalidación + rate limit"],
            ["ServicioEnvioOferta\nnormaliza"],
            ["SMTP Resend\nemail; no DB"],
        ],
        "flujos": ["submit", "toRequest", "202 / error", "send", "entrega"],
    },
    {
        "id": "17-flujo-tablon",
        "titulo": "Secuencia de Message Board",
        "columnas": [
            ["Visitante"],
            ["TablonMensajes"],
            ["ServicioTablon Angular\nGET / POST"],
            ["ControladorTablon\nvalidación + límite"],
            ["ServicioTablon Java\nUTC + DTO"],
            ["RepositorioMensajes\nSQL Server"],
        ],
        "flujos": ["cargar / publicar", "JSON", "201 / página", "save/query", "persistir"],
    },
    {
        "id": "18-sesion-admin",
        "titulo": "Activación administrativa de un solo uso",
        "columnas": [
            ["Script local\nclave raíz en .env"],
            ["POST /activation\nsolo loopback directo"],
            ["Código aleatorio\nhash en memoria, 2 min"],
            ["Fragmento URL\nse consume y borra"],
            ["POST /session\nOrigin exacto"],
            ["Cookie HMAC\nHttpOnly Secure Strict"],
            ["DELETE mensaje\nrevalida servidor"],
        ],
        "flujos": ["cabecera local", "código", "navegador", "canje", "30 días", "moderación"],
    },
    {
        "id": "19-actividad-sistema",
        "titulo": "ActividadSistema y Administrador de tareas",
        "columnas": [
            ["Interceptor HttpClient", "GestorVentanas", "Juegos / Paint / archivos / idioma"],
            ["ActividadSistema\n60 eventos + pulsos 3 s"],
            ["Métricas\nrequests, errores, latencia, bytes"],
            ["Mapa Task Manager\nventanas + API + DB + assets"],
            ["Sin telemetría externa\nsin CPU/RAM inventada"],
        ],
        "flujos": ["begin/complete", "pulse", "computed", "render"],
    },
    {
        "id": "20-fronteras-seguridad",
        "titulo": "Fronteras de confianza y controles",
        "columnas": [
            ["No confiable\ninputs, URLs, cabeceras"],
            ["Cliente\nvalidación UX, sandbox iframe"],
            ["Edge\nTLS + cabeceras Pages"],
            ["API\n16 KiB, Bean Validation, CORS, rate limit"],
            ["Administración\nloopback + HMAC + cookie"],
            ["Datos / secretos\n.env fuera de Git; DB loopback"],
        ],
        "flujos": ["sanear", "aislar", "filtrar", "autorizar", "persistir"],
    },
]


def fuente(nombre: str, tamano: int, negrita: bool = False) -> ImageFont.FreeTypeFont:
    candidatos = [
        Path("C:/Windows/Fonts/segoeuib.ttf" if negrita else "C:/Windows/Fonts/segoeui.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf" if negrita else "C:/Windows/Fonts/arial.ttf"),
    ]
    for candidato in candidatos:
        if candidato.exists():
            return ImageFont.truetype(str(candidato), tamano)
    return ImageFont.load_default()


def lineas(texto: str, max_chars: int = 24) -> list[str]:
    salida: list[str] = []
    for parrafo in texto.split("\n"):
        salida.extend(wrap(parrafo, max_chars) or [""])
    return salida


def renderizar_diagrama(diagrama: dict) -> Path:
    ancho, alto = 2400, 1350
    imagen = Image.new("RGB", (ancho, alto), "#f4f7fb")
    d = ImageDraw.Draw(imagen)
    titulo_font = fuente("Segoe", 58, True)
    nodo_font = fuente("Segoe", 29, True)
    flujo_font = fuente("Segoe", 22, False)
    d.rectangle((0, 0, ancho, 118), fill="#13233a")
    d.text((70, 30), diagrama["titulo"], font=titulo_font, fill="white")
    columnas = diagrama["columnas"]
    margen_x, top, bottom = 70, 175, 1240
    hueco = 34
    col_w = (ancho - margen_x * 2 - hueco * (len(columnas) - 1)) / len(columnas)
    centros: list[tuple[float, float]] = []
    for ci, columna in enumerate(columnas):
        x1 = margen_x + ci * (col_w + hueco)
        bloque_h = min(230, (bottom - top - 24 * (len(columna) - 1)) / max(1, len(columna)))
        total_h = len(columna) * bloque_h + (len(columna) - 1) * 24
        y = top + (bottom - top - total_h) / 2
        col_centers = []
        for ni, texto in enumerate(columna):
            y1 = y + ni * (bloque_h + 24)
            y2 = y1 + bloque_h
            color = ["#dceaff", "#e5f6ed", "#fff0d6", "#eee6ff", "#ffe4e6", "#dff7f4"][ci % 6]
            borde = ["#2b63a5", "#217a4d", "#a05a00", "#6246a5", "#a63d4c", "#19756e"][ci % 6]
            d.rounded_rectangle((x1, y1, x1 + col_w, y2), radius=24, fill=color, outline=borde, width=5)
            ls = lineas(texto, max(15, int(col_w / 22)))
            bbox = d.multiline_textbbox((0, 0), "\n".join(ls), font=nodo_font, spacing=9, align="center")
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            d.multiline_text((x1 + (col_w - tw) / 2, y1 + (bloque_h - th) / 2), "\n".join(ls), font=nodo_font, fill="#172033", spacing=9, align="center")
            col_centers.append((x1 + col_w / 2, y1 + bloque_h / 2))
        centros.append((x1 + col_w / 2, sum(c[1] for c in col_centers) / len(col_centers)))
    for i in range(len(centros) - 1):
        x1 = margen_x + (i + 1) * col_w + i * hueco
        x2 = x1 + hueco
        y = (centros[i][1] + centros[i + 1][1]) / 2
        d.line((x1 + 4, y, x2 - 8, y), fill="#34445d", width=6)
        d.polygon([(x2 - 8, y - 12), (x2 - 8, y + 12), (x2 + 5, y)], fill="#34445d")
        if i < len(diagrama.get("flujos", [])):
            etiqueta = diagrama["flujos"][i]
            bbox = d.textbbox((0, 0), etiqueta, font=flujo_font)
            d.rectangle((x1 - 4, y - 45, x2 + 4, y - 15), fill="#f4f7fb")
            d.text(((x1 + x2 - (bbox[2] - bbox[0])) / 2, y - 45), etiqueta, font=flujo_font, fill="#34445d")
    d.text((70, 1290), "CONFIRMADO por código/configuración salvo donde el dosier indique lo contrario.", font=flujo_font, fill="#52657c")
    destino = DIR_RENDER / f"{diagrama['id']}.png"
    imagen.save(destino, optimize=True)
    (DIR_FUENTES / f"{diagrama['id']}.json").write_text(json.dumps(diagrama, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return destino


def ejecutar_git(*args: str) -> list[str]:
    resultado = subprocess.run(["git", *args], cwd=RAIZ, check=True, capture_output=True, text=True, encoding="utf-8")
    return resultado.stdout.splitlines()


def responsabilidad_archivo(ruta: Path) -> str:
    texto = ruta.as_posix()
    if "/applications/" in texto:
        return "Aplicación: interfaz, interacción o estado de su herramienta."
    if "/desktop/components/" in texto:
        return "Componente del shell: presenta o emite acciones de escritorio."
    if "/desktop/services/" in texto:
        return "Servicio de escritorio: estado, ciclo de vida o persistencia cliente."
    if "/core/services/" in texto:
        return "Servicio transversal: datos, red, idioma, descarga o sesión."
    if "/core/system-activity/" in texto:
        return "Observabilidad local: captura, modela o agrega actividad real."
    if "/core/models/" in texto or "/desktop/models/" in texto:
        return "Contrato TypeScript compartido."
    if "/controller/" in texto:
        return "Entrada HTTP: valida el contrato y delega en servicios."
    if "/service/" in texto:
        return "Caso de uso backend o control transversal."
    if "/repository/" in texto:
        return "Acceso Spring Data JPA a persistencia."
    if "/domain/" in texto:
        return "Modelo de dominio persistente o categoría."
    if "/dto/" in texto:
        return "Contrato REST independiente de las entidades."
    if "/config/" in texto:
        return "Configuración, seguridad o carga inicial."
    return "Símbolo de soporte del arranque o configuración."


def dependencias_locales(contenido: str) -> str:
    nombres: list[str] = []
    for importado in re.findall(r"from\s+['\"]([^'\"]+)['\"]", contenido):
        if importado.startswith("."):
            nombres.append(Path(importado).name)
    for importado in re.findall(r"^import\s+com\.danielramon\.portfolio\.[\w.]+\.([A-Za-z0-9_]+);", contenido, re.MULTILINE):
        nombres.append(importado)
    unicos = list(dict.fromkeys(nombres))[:4]
    return ", ".join(unicos) if unicos else "framework / tipos del propio archivo"


def inventario_simbolos() -> tuple[str, int]:
    rutas = [Path(r) for r in ejecutar_git("ls-files") if r.endswith((".ts", ".java")) and "/test/" not in r and not r.endswith(".spec.ts")]
    filas: list[tuple[str, str, str, str]] = []
    patrones = [
        (re.compile(r"^export\s+(?:abstract\s+)?(?:class|interface|type|enum|const|function)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ0-9_]+)"), "exportado"),
        (re.compile(r"^public\s+(?:static\s+)?(?:final\s+)?(?:class|interface|record|enum)\s+([A-Za-z0-9_]+)"), "tipo Java"),
        (re.compile(r"^\s{2}(?:public\s+|protected\s+|private\s+)?(?:readonly\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\([^;]*\)\s*(?::[^=]+)?\s*\{"), "método TS"),
        (re.compile(r"^\s{4}public\s+(?:static\s+)?[^=;]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*\("), "método Java"),
    ]
    excluir = {"if", "for", "while", "switch", "catch", "constructor"}
    for ruta in rutas:
        abs_ruta = RAIZ / ruta
        try:
            contenido = abs_ruta.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        vistos: set[str] = set()
        for linea in contenido.splitlines():
            for patron, tipo in patrones:
                coincidencia = patron.match(linea)
                if coincidencia:
                    simbolo = coincidencia.group(1)
                    if simbolo in excluir or simbolo in vistos:
                        break
                    vistos.add(simbolo)
                    filas.append((
                        ruta.as_posix(),
                        simbolo,
                        tipo,
                        f"{responsabilidad_archivo(ruta)} Dep.: {dependencias_locales(contenido)}.",
                    ))
                    break
    lineas_md = [
        "## Apéndice C. Inventario de símbolos",
        "",
        "Inventario mecánico verificado contra los fuentes versionados. Incluye tipos exportados y métodos detectables, con la responsabilidad de su capa y dependencias locales importadas. Los capítulos anteriores contienen las trazas semánticas de los símbolos críticos.",
        "",
        "| Archivo | Símbolo | Tipo | Responsabilidad / dependencias locales |",
        "|---|---|---|---|",
    ]
    for ruta, simbolo, tipo, responsabilidad in filas:
        lineas_md.append(f"| `{ruta}` | `{simbolo}` | {tipo} | {responsabilidad} |")
    return "\n".join(lineas_md) + "\n", len(filas)


def arbol_repositorio() -> str:
    rutas = ejecutar_git("ls-files")
    relevantes = sorted({
        p.split("/")[0] + ("/" + p.split("/")[1] if "/" in p and p.split("/")[0] in {"frontend", "backend", "docs", "scripts", "cloudflare", ".github"} else "")
        for p in rutas
    })
    return "\n".join(f"- `{p}`" for p in relevantes)


def construir_markdown() -> int:
    base = BASE_MD.read_text(encoding="utf-8")
    simbolos, numero = inventario_simbolos()
    base = base.replace("{{ARBOL_GENERADO}}", arbol_repositorio())
    base = base.replace("{{INVENTARIO_SIMBOLOS}}", simbolos)
    FINAL_MD.write_text(base.rstrip() + "\n", encoding="utf-8")
    return numero


def registrar_fuentes_pdf() -> tuple[str, str, str]:
    normal = Path("C:/Windows/Fonts/segoeui.ttf")
    negrita = Path("C:/Windows/Fonts/segoeuib.ttf")
    mono = Path("C:/Windows/Fonts/consola.ttf")
    pdfmetrics.registerFont(TTFont("DRP", str(normal)))
    pdfmetrics.registerFont(TTFont("DRP-Bold", str(negrita)))
    pdfmetrics.registerFont(TTFont("DRP-Mono", str(mono)))
    return "DRP", "DRP-Bold", "DRP-Mono"


def escapar(texto: str) -> str:
    seguro = html.escape(texto, quote=False)
    seguro = re.sub(r"`([^`]+)`", r'<font name="DRP-Mono">\1</font>', seguro)
    seguro = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", seguro)
    return seguro


def pie(canvas, doc):
    canvas.saveState()
    canvas.setFont("DRP", 8)
    canvas.setFillColor(colors.HexColor("#58677a"))
    canvas.drawString(18 * mm, 10 * mm, "DRP OS · Documentación técnica definitiva · 7 septiembre 2026")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Página {doc.page}")
    canvas.setStrokeColor(colors.HexColor("#c9d3df"))
    canvas.line(18 * mm, 14 * mm, A4[0] - 18 * mm, 14 * mm)
    canvas.restoreState()


def markdown_a_flowables(texto: str):
    normal, bold, mono = registrar_fuentes_pdf()
    estilos = getSampleStyleSheet()
    cuerpo = ParagraphStyle("Cuerpo", parent=estilos["BodyText"], fontName=normal, fontSize=9.1, leading=12.3, textColor=colors.HexColor("#202b3a"), spaceAfter=5)
    h1 = ParagraphStyle("H1", parent=cuerpo, fontName=bold, fontSize=20, leading=24, textColor=colors.HexColor("#10243e"), spaceBefore=10, spaceAfter=9)
    h2 = ParagraphStyle("H2", parent=cuerpo, fontName=bold, fontSize=15, leading=19, textColor=colors.HexColor("#174f82"), spaceBefore=10, spaceAfter=7)
    h3 = ParagraphStyle("H3", parent=cuerpo, fontName=bold, fontSize=11.5, leading=15, textColor=colors.HexColor("#38546f"), spaceBefore=8, spaceAfter=5)
    codigo = ParagraphStyle("Codigo", parent=cuerpo, fontName=mono, fontSize=7.2, leading=9.3, leftIndent=7, rightIndent=7, backColor=colors.HexColor("#f0f3f7"), borderPadding=6, borderColor=colors.HexColor("#c7d2df"), borderWidth=0.5)
    leyenda = ParagraphStyle("Leyenda", parent=cuerpo, fontSize=8, leading=10, textColor=colors.HexColor("#52657c"), alignment=TA_CENTER)
    portada_titulo = ParagraphStyle("Portada", parent=h1, fontSize=28, leading=34, alignment=TA_CENTER, textColor=colors.white)
    portada_sub = ParagraphStyle("PortadaSub", parent=cuerpo, fontSize=13, leading=18, alignment=TA_CENTER, textColor=colors.HexColor("#dce8f6"))
    flujo = []
    lineas_md = texto.splitlines()
    i = 0
    primera_h1 = True
    while i < len(lineas_md):
        linea = lineas_md[i]
        if linea.startswith("```"):
            bloque = []
            i += 1
            while i < len(lineas_md) and not lineas_md[i].startswith("```"):
                bloque.append(lineas_md[i])
                i += 1
            flujo.append(Paragraph("<br/>".join(html.escape(x).replace(" ", "&nbsp;") for x in bloque) or " ", codigo))
        elif linea.startswith("!["):
            m = re.match(r"!\[([^]]*)\]\(([^)]+)\)", linea)
            if m:
                ruta = RAIZ / "docs" / m.group(2)
                img = PdfImage(str(ruta), width=174 * mm, height=97.875 * mm)
                flujo.extend([Spacer(1, 2 * mm), img, Paragraph(escapar(m.group(1)), leyenda), Spacer(1, 2 * mm)])
        elif linea.startswith("# "):
            if primera_h1:
                flujo.extend([
                    Spacer(1, 42 * mm),
                    Table([[Paragraph(escapar(linea[2:]), portada_titulo), Paragraph("AUDITORÍA<br/>2026", portada_sub)]], colWidths=[125 * mm, 45 * mm], style=TableStyle([("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#13233a")), ("VALIGN", (0,0), (-1,-1), "MIDDLE"), ("BOX", (0,0), (-1,-1), 1, colors.HexColor("#2f76ad")), ("LEFTPADDING",(0,0),(-1,-1),10*mm),("RIGHTPADDING",(0,0),(-1,-1),10*mm),("TOPPADDING",(0,0),(-1,-1),15*mm),("BOTTOMPADDING",(0,0),(-1,-1),15*mm)])),
                    Spacer(1, 12 * mm),
                ])
                primera_h1 = False
            else:
                flujo.extend([PageBreak(), Paragraph(escapar(linea[2:]), h1)])
        elif linea.startswith("## "):
            flujo.append(Paragraph(escapar(linea[3:]), h2))
        elif linea.startswith("### "):
            flujo.append(Paragraph(escapar(linea[4:]), h3))
        elif linea.strip() == "<!-- PAGEBREAK -->":
            flujo.append(PageBreak())
        elif linea.startswith("|") and i + 1 < len(lineas_md) and re.match(r"^\|?\s*:?-+", lineas_md[i + 1]):
            filas = []
            while i < len(lineas_md) and lineas_md[i].startswith("|"):
                if not re.match(r"^\|?\s*:?-+", lineas_md[i]):
                    celdas = [c.strip() for c in lineas_md[i].strip("|").split("|")]
                    filas.append([Paragraph(escapar(c), cuerpo) for c in celdas])
                i += 1
            i -= 1
            if filas:
                ancho_util = 174 * mm
                tabla = Table(filas, colWidths=[ancho_util / len(filas[0])] * len(filas[0]), repeatRows=1)
                tabla.setStyle(TableStyle([
                    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#173f66")),
                    ("TEXTCOLOR", (0,0), (-1,0), colors.white),
                    ("FONTNAME", (0,0), (-1,0), bold),
                    ("GRID", (0,0), (-1,-1), 0.35, colors.HexColor("#aebdce")),
                    ("VALIGN", (0,0), (-1,-1), "TOP"),
                    ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f1f5f9")]),
                    ("LEFTPADDING", (0,0), (-1,-1), 4), ("RIGHTPADDING", (0,0), (-1,-1), 4),
                    ("TOPPADDING", (0,0), (-1,-1), 3), ("BOTTOMPADDING", (0,0), (-1,-1), 3),
                ]))
                flujo.extend([tabla, Spacer(1, 2 * mm)])
        elif re.match(r"^[-*] ", linea):
            items = []
            while i < len(lineas_md) and re.match(r"^[-*] ", lineas_md[i]):
                items.append(ListItem(Paragraph(escapar(lineas_md[i][2:]), cuerpo), leftIndent=10))
                i += 1
            i -= 1
            flujo.append(ListFlowable(items, bulletType="bullet", leftIndent=16, bulletFontName=normal, bulletFontSize=7))
        elif re.match(r"^\d+\. ", linea):
            items = []
            while i < len(lineas_md) and re.match(r"^\d+\. ", lineas_md[i]):
                items.append(ListItem(Paragraph(escapar(re.sub(r"^\d+\. ", "", lineas_md[i])), cuerpo), leftIndent=10))
                i += 1
            i -= 1
            flujo.append(ListFlowable(items, bulletType="1", leftIndent=20, bulletFontName=normal, bulletFontSize=8))
        elif linea.strip():
            parrafos = [linea]
            while i + 1 < len(lineas_md) and lineas_md[i + 1].strip() and not re.match(r"^(#|\||```|!\[|[-*] |\d+\. |<!--)", lineas_md[i + 1]):
                i += 1
                parrafos.append(lineas_md[i])
            flujo.append(Paragraph(escapar(" ".join(parrafos)), cuerpo))
        else:
            flujo.append(Spacer(1, 1.2 * mm))
        i += 1
    return flujo


def construir_pdf():
    doc = BaseDocTemplate(str(FINAL_PDF), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=17 * mm, bottomMargin=18 * mm, title="Documentación técnica definitiva de DRP OS", author="Auditoría técnica del repositorio DRP OS")
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([PageTemplate(id="principal", frames=frame, onPage=pie)])
    doc.build(markdown_a_flowables(FINAL_MD.read_text(encoding="utf-8")))


def main():
    DIR_FUENTES.mkdir(parents=True, exist_ok=True)
    DIR_RENDER.mkdir(parents=True, exist_ok=True)
    for diagrama in DIAGRAMAS:
        renderizar_diagrama(diagrama)
    numero_simbolos = construir_markdown()
    construir_pdf()
    print(json.dumps({"pdf": str(FINAL_PDF), "markdown": str(FINAL_MD), "diagramas": len(DIAGRAMAS), "simbolos": numero_simbolos}, ensure_ascii=False))


if __name__ == "__main__":
    main()
