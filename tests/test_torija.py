from pathlib import Path
import hashlib
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


class TorijaTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(["python3", str(ROOT / "scripts/preparar_web.py")], check=True, capture_output=True)

    def test_motor_sin_cambios_fuera_de_seguridad_y_version(self):
        source = (ROOT / "app.js").read_text(encoding="utf-8")
        source = re.sub(r"^/\* SEGURIDAD_IMPORTACION_INICIO \*/\n.*?^/\* SEGURIDAD_IMPORTACION_FIN \*/\n\n?",
                        "", source, flags=re.M | re.S)
        source = source.replace("    const url = this.cache.get(clave);\n    return esFotoSegura(url) ? url : null;",
                                "    return this.cache.get(clave) || null;")
        for field in ("p.id", "e.id", "fotoUrl", "h.comidasCumplidas", "h.adherencia"):
            source = source.replace("${esc(" + field + ")}", "${" + field + "}")
        source = source.replace('src="${esc(url)}"', 'src="${url}"')
        source = re.sub(r"^const VERSION = .*;$", "const VERSION = metadata;", source, count=1, flags=re.M)
        source = re.sub(r"^const VERSION_FECHA = .*;$", "const VERSION_FECHA = metadata;", source, count=1, flags=re.M)
        self.assertEqual(hashlib.sha256(source.encode()).hexdigest(),
                         "deab7c48ffdc6277bd8ab6536503dd1b66f119bc24b89bb49a91c3d60b576471")  # v1.5.1: sesión e inactividad

    def test_validacion_importacion_y_fotos(self):
        subprocess.run(["node", str(ROOT / "tests/seguridad_importacion.cjs")], check=True)

    def test_nube_esquema_y_estilos_base_intactos(self):
        for name, expected in {
            "nube.js": "a6aa54bfd8d18a16d80ca7748b245754fa25c725ac4fe734f2a9aee1a0cfa34e",
            "supabase.sql": "9debc07633269cfbb0914bc1156d94a28cb202dd99ad6dac48bf6432d3ad059d",
            "styles.css": "5856a7e069dc7c7962ca50df465aa20ebef84c3e327a745dc0e4fe3ef15ddf0d",
        }.items():
            with self.subTest(file=name):
                self.assertEqual(hashlib.sha256((ROOT / name).read_bytes()).hexdigest(), expected)

    def test_sdk_local_verificado_y_csp(self):
        import base64
        sdk = (ROOT / "vendor/supabase-js-2.115.0.js").read_bytes()
        sri = "sha384-" + base64.b64encode(hashlib.sha384(sdk).digest()).decode()
        page = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn(f'src="vendor/supabase-js-2.115.0.js" integrity="{sri}"', page)
        self.assertEqual(sri, "sha384-CLZeq1dk8+Uzrs7TVvBUdlFoV5F0DMqgRoeHa8g5wJcuPe5SkVfEvdxB0ZuzlnBQ")
        self.assertNotRegex(page, r'<script[^>]+src=["\']https?://')
        csp = re.search(r'http-equiv="Content-Security-Policy"\s+content="([^"]+)"', page).group(1)
        self.assertIn("script-src 'self';", csp)
        self.assertIn("connect-src 'self' https://ymkojmxilsitilfpmfxc.supabase.co wss://ymkojmxilsitilfpmfxc.supabase.co;", csp)
        self.assertIn("object-src 'none'", csp)
        self.assertNotIn("unsafe-eval", csp)
        self.assertEqual(sdk, (ROOT / "dist/public/vendor/supabase-js-2.115.0.js").read_bytes())
        self.assertFalse((ROOT / "dist/preview/vendor").exists())

    def test_candidata_identica_al_codigo(self):
        for name in ("index.html", "app.js", "nube.js", "styles.css"):
            self.assertEqual((ROOT / name).read_bytes(), (ROOT / "dist/public" / name).read_bytes())

    def test_demo_sin_red_y_sin_sdk(self):
        for name in ("index.html", "acceso-demo.html"):
            source = (ROOT / "dist/preview" / name).read_text(encoding="utf-8")
            self.assertIn("connect-src 'none'", source)
            self.assertNotIn("cdn.jsdelivr.net", source)
            self.assertNotRegex(source, r'<script[^>]+src=["\']https?://')
        cloud = (ROOT / "dist/preview/nube.js").read_text(encoding="utf-8")
        self.assertNotIn("ymkojmxilsitilfpmfxc", cloud)
        self.assertNotIn("sb_publishable_", cloud)

    def test_demo_memoria_sin_apis_de_persistencia(self):
        source = (ROOT / "dist/preview/app.js").read_text(encoding="utf-8")
        self.assertIn("const CLAVE_DATOS = 'Torija.Dieta.demo.v1';", source)
        self.assertIn("const CLAVE_COPIA = 'Torija.Dieta.demo.v1.copia';", source)
        self.assertIn("const CLAVE_BLOQUEO = 'Torija.Dieta.demo.v1.bloqueo';", source)
        self.assertNotIn("miPlanDieta", source)
        self.assertIn("memoria: Object.create(null)", source)
        for name in ("app.js", "demo-inicio.js", "demo-acceso.js", "nube.js"):
            script = (ROOT / "dist/preview" / name).read_text(encoding="utf-8")
            self.assertNotRegex(script, r"\b(localStorage|sessionStorage|indexedDB)\s*[.\[]")
            self.assertNotIn("'indexedDB' in window", script)

    def test_sin_documentacion_o_datos_en_salidas(self):
        for folder in ("public", "preview"):
            for file in (ROOT / "dist" / folder).rglob("*"):
                if file.is_file():
                    self.assertIn(file.suffix, {".html", ".css", ".js", ".woff2"})
                    self.assertNotIn(".git", file.parts)

    def test_fuentes_locales_validas(self):
        fonts = list((ROOT / "styles/fonts").glob("*.woff2"))
        self.assertEqual(len(fonts), 6)
        for file in fonts:
            self.assertEqual(file.read_bytes()[:4], b"wOF2")
        self.assertNotIn("api.fontshare", (ROOT / "index.html").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
