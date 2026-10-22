#!/usr/bin/env python3
"""Build isolated offline preview and unmodified-backend production candidate."""
from pathlib import Path
import html
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "dist" / "public"
PREVIEW = ROOT / "dist" / "preview"


def once(text, old, new):
    if text.count(old) != 1:
        raise ValueError(f"Se esperaba una coincidencia: {old}")
    return text.replace(old, new, 1)


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def main():
    sources = [ROOT / name for name in ("index.html", "styles.css", "app.js", "nube.js")]
    sources += sorted(p for p in (ROOT / "styles").rglob("*") if p.is_file())
    for src in sources:
        if src.parent != ROOT and src.suffix not in (".css", ".woff2"):
            raise ValueError(f"Recurso de estilo inesperado: {src}")
        for dest in (PUBLIC, PREVIEW):
            out = dest / src.relative_to(ROOT)
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, out)

    document = (ROOT / "index.html").read_text(encoding="utf-8")
    sdk = '    <script src="vendor/supabase-js-2.115.0.js" integrity="sha384-CLZeq1dk8+Uzrs7TVvBUdlFoV5F0DMqgRoeHa8g5wJcuPe5SkVfEvdxB0ZuzlnBQ"></script>\n'
    production_csp = re.search(r'    <meta\n      http-equiv="Content-Security-Policy"\n.*?/>\n', document, re.S)
    if not production_csp:
        raise ValueError("Falta la política de seguridad de producción")
    document = document.replace(production_csp.group(0), "", 1)
    demo = once(document, sdk, "")
    csp = """    <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'">
    <link rel="stylesheet" href="demo.css">
"""
    demo = once(demo, "  </head>", csp + "  </head>")
    demo = once(demo, "    <!-- ============ Cabecera ============ -->", """    <aside class="demo-aviso" aria-label="Demostración aislada">
      <div class="demo-aviso-inner"><p><strong>Vista previa Torija · Demostración temporal</strong>Sin Supabase ni datos reales. Los cambios de prueba se pierden al recargar. No introduzcas datos ni fotografías personales.</p>
      <a class="btn" href="acceso-demo.html">Ver diseño del acceso</a></div>
    </aside>
    <!-- ============ Cabecera ============ -->""")
    demo = once(demo, '    <script src="app.js"></script>', '    <script src="app.js"></script>\n    <script src="demo-inicio.js"></script>')
    write(PREVIEW / "index.html", demo)

    app = (ROOT / "app.js").read_text(encoding="utf-8")
    demo_app = once(app, "const CLAVE_DATOS = 'miPlanDieta.v1';", "const CLAVE_DATOS = 'Torija.Dieta.demo.v1';")
    demo_app = once(demo_app, "const CLAVE_COPIA = 'miPlanDieta.v1.copia';", "const CLAVE_COPIA = 'Torija.Dieta.demo.v1.copia';")
    demo_app = once(demo_app, "const CLAVE_BLOQUEO = 'miPlanDieta.v1.bloqueo';", "const CLAVE_BLOQUEO = 'Torija.Dieta.demo.v1.bloqueo';")
    demo_app = once(demo_app, "const CLAVE_INACTIVIDAD = 'miPlanDieta.v1.inactividad';", "const CLAVE_INACTIVIDAD = 'Torija.Dieta.demo.v1.inactividad';")
    demo_app = once(demo_app, "const CLAVE_ACTIVIDAD = 'miPlanDieta.v1.actividad';", "const CLAVE_ACTIVIDAD = 'Torija.Dieta.demo.v1.actividad';")
    storage_start = demo_app.index("/** Envoltorio de localStorage")
    storage_end = demo_app.index("/* ---------------------------------------------------------\n   4. Estado")
    memory = (ROOT / "preview/almacen-memoria.js").read_text(encoding="utf-8")
    demo_app = demo_app[:storage_start] + memory + "\n\n" + demo_app[storage_end:]
    lock_start = demo_app.index("const Bloqueo = {")
    lock_end = demo_app.index("/** Escribe la versión en la pantalla de acceso", lock_start)
    demo_app = demo_app[:lock_start] + ("const Bloqueo = { activo: () => false, fijar() {}, permitidoAhora: false };\n"
        "const OPCIONES_INACTIVIDAD = [0];\n"
        "const Inactividad = { minutos: () => 0, fijar() {}, registrar() {}, caducadaAlAbrir: () => false, iniciar() {} };\n\n") + demo_app[lock_end:]
    demo_app = once(demo_app,
                    "toast('El almacenamiento local está bloqueado en este contexto: los datos no se conservarán al recargar', 'error');",
                    "toast('Demostración temporal: los cambios se pierden al recargar');")
    write(PREVIEW / "app.js", demo_app)
    cloud = (ROOT / "nube.js").read_text(encoding="utf-8")
    cloud = re.sub(r"url: 'https://[^']+\.supabase\.co'", "url: 'https://demo.invalid'", cloud, count=1)
    cloud = re.sub(r"clavePublicable: '[^']+'", "clavePublicable: 'demo-sin-backend'", cloud, count=1)
    write(PREVIEW / "nube.js", cloud)

    access = once(document, sdk, "")
    access = once(access, '    <script src="nube.js"></script>\n', "")
    access = once(access, '    <script src="app.js"></script>', '    <script src="demo-acceso.js"></script>')
    access = once(access, "  </head>", csp + "  </head>")
    version = re.search(r"^const VERSION = '([^']+)';", app, re.M).group(1)
    date = re.search(r"^const VERSION_FECHA = '([^']+)';", app, re.M).group(1)
    access = once(access, '<p class="hint acceso-version" id="acceso-version"></p>',
                  f'<p class="hint acceso-version" id="acceso-version">Versión {html.escape(version)} ({html.escape(date)})</p>')
    access = once(access, '        <p class="hint acceso-nota"', '        <a class="btn demo-volver" href="index.html">Volver a la demostración</a>\n        <p class="hint acceso-nota"')
    write(PREVIEW / "acceso-demo.html", access)
    for name in ("demo-inicio.js", "demo-acceso.js", "demo.css"):
        shutil.copy2(ROOT / "preview" / name, PREVIEW / name)

    vendor = ROOT / "vendor" / "supabase-js-2.115.0.js"
    (PUBLIC / "vendor").mkdir(parents=True, exist_ok=True)
    shutil.copy2(vendor, PUBLIC / "vendor" / vendor.name)

    shared = {p.relative_to(ROOT) for p in sources}
    for folder, allowed in ((PUBLIC, shared | {vendor.relative_to(ROOT)}), (PREVIEW, shared | {Path(n) for n in ("acceso-demo.html", "demo-inicio.js", "demo-acceso.js", "demo.css")})):
        unexpected = {p.relative_to(folder) for p in folder.rglob("*") if p.is_file()} - allowed
        if unexpected:
            raise ValueError(f"Archivos no publicables en {folder}: {unexpected}")
    print(f"Candidata: {PUBLIC}\nDemostración aislada: {PREVIEW}")


if __name__ == "__main__":
    main()
