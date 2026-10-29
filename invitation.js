/*
 * Invitation de parrainage sur la page d'accueil (29/10/2026) - Le Cahier de l'instituteur.
 *
 * Lien personnel genere par le serveur : https://cahier-de-l-instituteur.com/?ref=XXXX-XXXX (ancien « ?code= » accepte).
 *  - Le code (8 caracteres de l'alphabet du serveur) est verifie ici, garde 30 jours dans ce navigateur, puis :
 *    PWA : transmis par le lien https://app.cahier-de-l-instituteur.com/?ref=CODE (l'application le propose seule) ;
 *    APK : un navigateur ne transmet rien a une APK installee. Une fois l'application installee, le bouton
 *          « Ouvrir l'application avec ce code » (cahierinstituteur://parrainage?ref=CODE) la lui transmet ;
 *          a defaut, « Copier le code », puis « Coller » dans « Je veux m'abonner ».
 *  - Rien n'est attribue ici : le serveur revalide le code et ne cree une commission qu'apres paiement valide.
 * Affichage par textContent uniquement ; aucune requete reseau ; aucune donnee sur le parrain.
 */
"use strict";
(function () {
  var ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  var CLE = "cahier_invitation_v1";
  var DUREE_MS = 30 * 24 * 3600 * 1000;
  var PWA = "https://app.cahier-de-l-instituteur.com/";

  function normaliser(brut) {
    if (typeof brut !== "string" || brut.length > 24) return null;
    var t = brut.replace(/[\s-]/g, "").toUpperCase();
    if (t.length !== 8) return null;
    for (var i = 0; i < t.length; i++) {
      if (ALPHABET.indexOf(t.charAt(i)) < 0) return null;
    }
    return t.slice(0, 4) + "-" + t.slice(4);
  }

  function lire() {
    try {
      var m = JSON.parse(localStorage.getItem(CLE) || "null");
      if (m && normaliser(m.code) && typeof m.recu === "number" && Date.now() - m.recu < DUREE_MS) return m.code;
    } catch (e) { /* stockage indisponible */ }
    return null;
  }

  function garder(code) {
    try { localStorage.setItem(CLE, JSON.stringify({ code: code, recu: Date.now() })); } catch (e) { /* rien */ }
  }

  var params = new URLSearchParams(window.location.search);
  var brut = params.get("ref") !== null ? params.get("ref") : params.get("code");
  var duLien = brut === null ? null : normaliser(brut);
  // Lien ouvert explicitement : il l'emporte sur un code garde plus tot dans ce navigateur.
  if (duLien) garder(duLien);
  var code = duLien || lire();

  if (brut !== null && window.history && history.replaceState) {
    // Adresse au format officiel (copiable telle quelle), ou nettoyee si le code est invalide.
    history.replaceState(null, "", window.location.pathname + (duLien ? "?ref=" + duLien : "") + window.location.hash);
  }
  if (!code) return;

  var liensPwa = document.querySelectorAll('a[href^="' + PWA + '"]');
  for (var i = 0; i < liensPwa.length; i++) liensPwa[i].href = PWA + "?ref=" + code;
  if (typeof window.URL_PWA_INVITATION === "undefined") window.URL_PWA_INVITATION = PWA + "?ref=" + code;

  var bloc = document.getElementById("invitation");
  if (!bloc) return;
  document.getElementById("code-invitation").textContent = code;
  document.getElementById("ouvrir-app").href = "cahierinstituteur://parrainage?ref=" + code;
  bloc.hidden = false;

  function annoncer(texte) {
    document.getElementById("retour-invitation").textContent = texte;
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
  document.getElementById("copier-invitation").addEventListener("click", function () {
    var fin = function (ok) {
      annoncer(ok ? "Code copié : dans l'application, touchez « Coller » au champ « Code de parrainage »."
        : "Copie impossible : notez le code " + code + ".");
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(function () { fin(true); }, function () { fin(copierSecours(code)); });
    } else {
      fin(copierSecours(code));
    }
  });
})();
