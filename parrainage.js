/*
 * Page de parrainage (26/10/2026) - Le Cahier de l'instituteur.
 *
 * Lien attendu, tel que genere par le serveur (commerce/config.py) :
 *   https://avrison2026.github.io/cahier-instituteur-site/parrainage.html?code=XXXX-XXXX
 * Code : 8 caracteres de l'alphabet 23456789ABCDEFGHJKMNPQRSTUVWXYZ (sans 0, O, 1, I, L), presentes « XXXX-XXXX ».
 * Tout autre contenu est refuse. Le code est affiche avec textContent uniquement (jamais d'insertion HTML) ; la page
 * ne fait aucune requete reseau et ne connait rien du parrain (aucune donnee personnelle).
 * Une APK installee hors Play Store ne recoit pas ce lien : la transmission du code est EXPLICITE (copie, collage).
 */
"use strict";
(function () {
  var ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  var PAGE = "https://avrison2026.github.io/cahier-instituteur-site/parrainage.html";

  /** « abcd efgh », « ABCD-EFGH » -> « ABCD-EFGH » ; null si ce n'est pas un code du systeme. */
  function normaliser(brut) {
    if (typeof brut !== "string" || brut.length > 24) return null;
    var t = brut.replace(/[\s-]/g, "").toUpperCase();
    if (t.length !== 8) return null;
    for (var i = 0; i < t.length; i++) {
      if (ALPHABET.indexOf(t.charAt(i)) < 0) return null;
    }
    return t.slice(0, 4) + "-" + t.slice(4);
  }

  function messageComplet(code) {
    return "Je te recommande « Le Cahier de l'instituteur » pour préparer tes fiches et suivre ta classe. " +
      "Pour t'abonner (6 000 F CFA par niveau et par année scolaire), saisis mon code de parrainage " + code +
      " dans « Je veux m'abonner ». Télécharger l'application : " + PAGE + "?code=" + code;
  }

  function copier(texte) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(texte).then(function () { return true; }, function () { return copierSecours(texte); });
    }
    return Promise.resolve(copierSecours(texte));
  }

  function copierSecours(texte) {
    var zone = document.createElement("textarea");
    zone.value = texte;
    zone.setAttribute("readonly", "");
    zone.style.position = "fixed";
    zone.style.top = "-1000px";
    document.body.appendChild(zone);
    zone.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(zone);
    return ok;
  }

  function annoncer(texte, ok) {
    var retour = document.getElementById("retour-copie");
    retour.textContent = texte;
    retour.className = "retour-copie " + (ok ? "ok" : "echec");
  }

  function afficher(etat) {
    document.body.setAttribute("data-etat", etat);
    document.getElementById("bloc-valide").hidden = etat !== "valide";
    document.getElementById("bloc-absent").hidden = etat !== "absent";
    document.getElementById("bloc-invalide").hidden = etat !== "invalide";
  }

  var brut = new URLSearchParams(window.location.search).get("code");
  var code = brut === null ? null : normaliser(brut);

  if (code) {
    afficher("valide");
    document.getElementById("code-valeur").textContent = code;
    document.getElementById("eyebrow-texte").textContent = "Un collègue vous recommande l'application";
    document.getElementById("titre-principal").textContent = "Un collègue vous recommande Le Cahier de l'instituteur.";
    if (brut !== code && window.history && history.replaceState) {
      history.replaceState(null, "", "?code=" + code); // adresse au format officiel (copiable telle quelle)
    }
    document.getElementById("copier-code").addEventListener("click", function () {
      copier(code).then(function (ok) {
        annoncer(ok ? "Code copié : collez-le au champ « Code de parrainage »." : "Copie impossible : notez le code " + code + ".", ok);
      });
    });
    document.getElementById("copier-message").addEventListener("click", function () {
      copier(messageComplet(code)).then(function (ok) {
        annoncer(ok ? "Message copié : vous pouvez le partager." : "Copie impossible sur ce navigateur.", ok);
      });
    });
  } else {
    afficher(brut === null || brut === "" ? "absent" : "invalide");
    if (brut !== null && window.history && history.replaceState) {
      history.replaceState(null, "", window.location.pathname); // un code malforme n'est jamais repris ni recopie
    }
  }
})();
