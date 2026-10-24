# Publier une nouvelle version de l'application

L'application (à partir de la version 1.5.1, build 16) lit `mise-a-jour.json` à la racine de ce site
(https://avrison2026.github.io/cahier-instituteur-site/mise-a-jour.json, copie brute du dépôt en secours)
pour proposer la mise à jour intégrée : Réglages > Mises à jour, et la cloche de l'accueil qui clignote.

## Étapes

1. Dans le projet Flutter, augmenter le numéro de build dans `pubspec.yaml` (`version: 1.5.1+16` →
   `1.5.2+17`…). **Seul le numéro après le « + » (versionCode) est comparé** : il doit toujours augmenter.
2. Construire l'APK release, signée avec la clé habituelle (`android/key.properties`) :
   `flutter build apk --release`.
3. Créer une Release GitHub dans ce dépôt (tag `v1.5.2`, par exemple), joindre l'APK sous le nom exact
   `cahier-instituteur.apk` et écrire les principales améliorations dans les notes, une par puce
   (`- Nouvelle fonction…`). Publier la Release (ni brouillon ni pré-version).
4. Le workflow « Manifeste de mise a jour » (`.github/workflows/manifeste-mise-a-jour.yml`) se lance seul :
   il télécharge l'APK, vérifie sa signature et son certificat (`outils/certificats_autorises.txt`), son
   nom de paquet, son versionCode (jamais inférieur au manifeste publié), son empreinte (comparée à celle
   annoncée par GitHub), puis publie `mise-a-jour.json`. GitHub Pages le sert ensuite en quelques minutes.
5. Vérifier l'onglet « Actions » : le job doit être vert. S'il est rouge, le manifeste n'a PAS changé
   (les enseignants ne voient rien) : lire le message « REFUS : … ».

Modifier les notes d'une Release publiée relance le workflow (mêmes contrôles) et met à jour les notes.
Relance manuelle : Actions > Manifeste de mise a jour > Run workflow, avec le tag.

## Sécurité

- Le manifeste n'est jamais une preuve suffisante : sur le téléphone, l'application vérifie que l'APK
  téléchargée a le SHA-256 annoncé, le même nom de paquet, un versionCode supérieur ET la même signature
  que l'application installée. Une APK signée par une autre clé est refusée avant l'installation.
- Ne jamais changer de clé de signature : Android refuserait la mise à jour par-dessus l'application
  installée (et l'application n'est jamais désinstallée automatiquement).

## Génération à la main (secours)

```
python3 outils/generer_manifeste.py --apk cahier-instituteur.apk --tag v1.5.2 \
    --date 2026-11-01T10:00:00Z --notes-fichier notes.md
```

Nécessite les build-tools Android (`aapt2`, `apksigner`, variable `ANDROID_HOME`) et Java.
