#!/usr/bin/env python3
"""Genere mise-a-jour.json, le manifeste lu par l'application pour ses mises a jour integrees.

Toutes les valeurs sont lues dans l'APK elle-meme, jamais saisies a la main :
  - nom du paquet, versionCode, versionName, minSdk : `aapt2 dump badging` ;
  - signature : `apksigner verify --print-certs` (la signature est VERIFIEE, puis l'empreinte SHA-256 du
    certificat est comparee a outils/certificats_autorises.txt) ;
  - taille et SHA-256 : calcules sur le fichier.

Refus (code de sortie 1, manifeste inchange) : APK mal signee, certificat non autorise, autre application,
versionCode inferieur a celui du manifeste deja publie, empreinte differente de celle annoncee par GitHub
(--sha256-github), Release en brouillon ou en pre-version (geres par le workflow).

Utilisation (GitHub Actions, ou a la main avant de pousser) :
  python3 outils/generer_manifeste.py --apk cahier-instituteur.apk --tag v1.5.1 \\
      --date 2026-10-25T10:00:00Z --notes-fichier notes.md [--sha256-github <hex>]

L'application ne fait jamais confiance au seul manifeste : elle verifie aussi, sur le telephone, que l'APK
telechargee est signee par le meme certificat que l'application installee.
"""

from __future__ import annotations

import argparse
import glob
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

PAQUET = "com.avrison.cahierinstituteur.cahier_instituteur"
DEPOT = "Avrison2026/cahier-instituteur-site"
NOM_APK = "cahier-instituteur.apk"
RACINE = Path(__file__).resolve().parent.parent


class Refus(Exception):
    pass


def outil(nom: str) -> str:
    """Chemin d'un outil des build-tools Android (aapt2, apksigner), la version la plus recente."""
    sdk = os.environ.get("ANDROID_HOME") or os.environ.get("ANDROID_SDK_ROOT")
    candidats: list[str] = []
    if sdk:
        for dossier in sorted(glob.glob(os.path.join(sdk, "build-tools", "*")),
                              key=lambda d: [int(x) if x.isdigit() else 0 for x in re.split(r"[.-]", os.path.basename(d))],
                              reverse=True):
            for ext in ("", ".exe", ".bat"):
                chemin = os.path.join(dossier, nom + ext)
                if os.path.isfile(chemin):
                    candidats.append(chemin)
    trouve = shutil.which(nom)
    if trouve:
        candidats.append(trouve)
    if not candidats:
        raise Refus(f"outil Android introuvable : {nom} (definir ANDROID_HOME)")
    return candidats[0]


def executer(*args: str) -> str:
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise Refus(f"{os.path.basename(args[0])} a echoue : {(r.stderr or r.stdout).strip()[:500]}")
    return r.stdout


def lire_badging(apk: Path) -> dict:
    sortie = executer(outil("aapt2"), "dump", "badging", str(apk))
    m = re.search(r"^package: name='([^']+)' versionCode='(\d+)' versionName='([^']*)'", sortie, re.M)
    if not m:
        raise Refus("aapt2 : ligne « package » introuvable")
    min_sdk = re.search(r"^(?:minSdkVersion|sdkVersion):'(\d+)'", sortie, re.M)
    return {
        "paquet": m.group(1),
        "version_code": int(m.group(2)),
        "version": m.group(3),
        "min_sdk": int(min_sdk.group(1)) if min_sdk else None,
    }


def lire_certificats(apk: Path) -> list[str]:
    sortie = executer(outil("apksigner"), "verify", "--print-certs", "-v", str(apk))
    if not re.search(r"Verified using v[23](?:\.1)? scheme \(APK Signature Scheme v[23](?:\.1)?\): true", sortie):
        raise Refus("apksigner : aucune signature v2/v3 valide")
    certs = re.findall(r"certificate SHA-256 digest: ([0-9a-f]{64})", sortie)
    if not certs:
        raise Refus("apksigner : aucun certificat lu")
    return sorted(set(certs))


def certificats_autorises() -> set[str]:
    lignes = (RACINE / "outils" / "certificats_autorises.txt").read_text(encoding="utf-8").splitlines()
    return {l.strip().lower() for l in lignes if re.fullmatch(r"\s*[0-9a-fA-F]{64}\s*", l)}


def empreinte(apk: Path) -> str:
    h = hashlib.sha256()
    with apk.open("rb") as f:
        for bloc in iter(lambda: f.read(1024 * 1024), b""):
            h.update(bloc)
    return h.hexdigest()


def lire_notes(texte: str) -> list[str]:
    """Principales ameliorations : les puces des notes de la Release (sinon les lignes), 10 au plus."""
    lignes = [l.strip() for l in texte.replace("\r", "").split("\n")]
    lignes = [l for l in lignes if l and not l.startswith("#") and not l.lower().startswith("**full changelog")]
    puces = [re.sub(r"^[-*•]\s+", "", l) for l in lignes if re.match(r"^[-*•]\s+", l)]
    retenues = puces or lignes
    propres = [re.sub(r"\*\*(.+?)\*\*", r"\1", l).strip() for l in retenues]
    return [l for l in propres if l][:10]


def generer(apk: Path, tag: str, date: str | None, notes: str, sha_github: str | None, sortie: Path) -> dict:
    if not re.fullmatch(r"[A-Za-z0-9._-]+", tag):
        raise Refus(f"tag invalide : {tag!r}")
    infos = lire_badging(apk)
    if infos["paquet"] != PAQUET:
        raise Refus(f"autre application : {infos['paquet']}")
    certs = lire_certificats(apk)
    autorises = certificats_autorises()
    if not set(certs) <= autorises:
        raise Refus(f"certificat non autorise : {certs}")
    sha = empreinte(apk)
    if sha_github and sha_github.lower().removeprefix("sha256:") != sha:
        raise Refus("l'empreinte calculee differe de celle annoncee par GitHub")

    if sortie.exists():
        precedent = json.loads(sortie.read_text(encoding="utf-8"))
        if infos["version_code"] < int(precedent.get("version_code", 0)):
            raise Refus(f"versionCode {infos['version_code']} inferieur au manifeste publie "
                        f"({precedent.get('version_code')}) : aucun retour en arriere")

    manifeste = {
        "format": 1,
        "application": PAQUET,
        "version_code": infos["version_code"],
        "version": infos["version"],
        "tag": tag,
        "date_publication": date,
        "url_apk": f"https://github.com/{DEPOT}/releases/download/{tag}/{NOM_APK}",
        "taille_octets": apk.stat().st_size,
        "sha256": sha,
        "certificats_sha256": certs,
        "min_sdk": infos["min_sdk"],
        "nouveautes": lire_notes(notes),
    }
    sortie.write_text(json.dumps(manifeste, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifeste


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--apk", required=True, type=Path)
    p.add_argument("--tag", required=True)
    p.add_argument("--date", help="date de publication ISO 8601 (published_at de la Release)")
    p.add_argument("--notes-fichier", type=Path, help="notes de version (corps de la Release)")
    p.add_argument("--sha256-github", help="empreinte de l'asset annoncee par GitHub (digest), verifiee")
    p.add_argument("--sortie", type=Path, default=RACINE / "mise-a-jour.json")
    a = p.parse_args()
    notes = a.notes_fichier.read_text(encoding="utf-8") if a.notes_fichier and a.notes_fichier.exists() else ""
    try:
        m = generer(a.apk, a.tag, a.date, notes, a.sha256_github, a.sortie)
    except Refus as e:
        print(f"REFUS : {e}", file=sys.stderr)
        return 1
    print(f"Manifeste ecrit : {a.sortie} (version {m['version']}, versionCode {m['version_code']}, "
          f"{m['taille_octets']} octets, sha256 {m['sha256']})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
