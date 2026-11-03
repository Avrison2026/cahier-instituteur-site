/*
 * Bouton relais « Ouvrir dans Chrome » (03/11/2026) - Le Cahier de l'instituteur.
 *
 * Les navigateurs intégrés (WhatsApp, Facebook, Messenger, Instagram... : vue Web Android) téléchargent mal les
 * fichiers APK : le téléchargement s'arrête ou n'aboutit pas. Sur Android seulement :
 *  - navigateur intégré détecté : encadré au-dessus du bouton « Télécharger », avec « Ouvrir dans Chrome » (même
 *    page, code de parrainage compris) et « Copier le lien » (à coller dans Chrome si le relais ne s'ouvre pas) ;
 *  - autre navigateur que Chrome : petite ligne sous le bouton, avec le même relais.
 * Rien n'est envoyé : la page est seulement rouverte dans Chrome (lien intent:// d'Android).
 */
"use strict";
(function () {
  var ua = navigator.userAgent || "";
  if (!/Android/i.test(ua)) return;
  var bouton = document.getElementById("btn-telecharger");
  if (!bouton || !bouton.parentNode) return;

  var integre = /; wv\)|FBAN|FBAV|FB_IAB|Instagram|WhatsApp|Line\/|Snapchat|TikTok|musical_ly|GSA\//i.test(ua);
  var autreNavigateur = /SamsungBrowser|OPR\/|Opera|Firefox|EdgA|UCBrowser|MiuiBrowser|YaBrowser|HeyTapBrowser|Mi ?Browser/i.test(ua);
  if (!integre && !autreNavigateur) return; // Chrome : rien à proposer

  function lienChrome() {
    var l = window.location;
    return "intent://" + l.host + l.pathname + l.search +
      "#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=" +
      encodeURIComponent(l.origin + l.pathname + l.search) + ";end";
  }

  var style = document.createElement("style");
  style.textContent =
    ".relais-encadre{margin:0 0 14px;padding:14px 16px;border-radius:16px;background:#fff7ed;color:#5a3a22;" +
    "font-size:14.5px;line-height:1.45;text-align:left}" +
    ".relais-encadre strong{display:block;margin-bottom:4px;font-size:15.5px}" +
    ".relais-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}" +
    ".relais-bouton{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 16px;" +
    "border-radius:12px;background:#0e6656;color:#fff !important;font-weight:700;text-decoration:none;border:0;" +
    "font:inherit;font-weight:700;cursor:pointer}" +
    ".relais-bouton.discret{background:#fff;color:#0e6656 !important;border:1px solid #c9d4ce}" +
    ".relais-ligne{margin:10px 0 0;font-size:13.5px;color:#5d6b66;text-align:left}" +
    ".relais-ligne a{color:#0e6656;font-weight:700}";
  document.head.appendChild(style);

  if (integre) {
    var encadre = document.createElement("div");
    encadre.className = "relais-encadre";
    encadre.setAttribute("role", "note");
    var titre = document.createElement("strong");
    titre.textContent = "Ouvrez cette page dans Chrome pour télécharger";
    var texte = document.createElement("span");
    texte.textContent = "Vous êtes dans le navigateur d'une autre application (WhatsApp, Facebook…) : " +
      "le téléchargement de l'application risque de s'arrêter.";
    var actions = document.createElement("div");
    actions.className = "relais-actions";
    var ouvrir = document.createElement("a");
    ouvrir.className = "relais-bouton";
    ouvrir.href = lienChrome();
    ouvrir.textContent = "Ouvrir dans Chrome";
    var copier = document.createElement("button");
    copier.type = "button";
    copier.className = "relais-bouton discret";
    copier.textContent = "Copier le lien";
    copier.addEventListener("click", function () {
      var adresse = window.location.href;
      var fini = function (ok) { copier.textContent = ok ? "Lien copié : collez-le dans Chrome" : adresse; };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(adresse).then(function () { fini(true); }, function () { fini(false); });
      } else {
        fini(false);
      }
    });
    actions.appendChild(ouvrir);
    actions.appendChild(copier);
    encadre.appendChild(titre);
    encadre.appendChild(texte);
    encadre.appendChild(actions);
    bouton.parentNode.insertBefore(encadre, bouton);
  } else {
    var ligne = document.createElement("p");
    ligne.className = "relais-ligne";
    ligne.appendChild(document.createTextNode("Le téléchargement s'arrête ? "));
    var lien = document.createElement("a");
    lien.href = lienChrome();
    lien.textContent = "Ouvrir cette page dans Chrome";
    ligne.appendChild(lien);
    bouton.parentNode.insertBefore(ligne, bouton.nextSibling);
  }
})();
