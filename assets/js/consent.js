/**
 * Einwilligungsverwaltung (Consent) für Mehdis Tennis
 *
 * Zweck: Das Google-Ads-Tag (gtag.js) darf nach § 25 Abs. 1 TDDDG erst geladen
 * werden, NACHDEM der Nutzer aktiv eingewilligt hat. Das Skript wird deshalb
 * nicht im HTML eingebunden, sondern hier ausschließlich nach erteilter
 * Einwilligung dynamisch nachgeladen. Ohne Einwilligung entsteht keinerlei
 * Verbindung zu Google.
 *
 * Die Entscheidung des Nutzers (auch die Ablehnung) wird in localStorage
 * gespeichert. localStorage ist kein Cookie, unterliegt aber ebenfalls § 25
 * TDDDG - das Speichern der Entscheidung selbst ist als unbedingt erforderlich
 * einwilligungsfrei zulässig.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "mt-consent";
  var ADS_ID = "AW-17265899613";
  var MAX_AGE_DAYS = 365; // Einwilligung nach 12 Monaten erneut einholen

  /* ---------- Speicherung ------------------------------------------------ */

  // localStorage kann im privaten Modus oder bei blockierten Site-Daten werfen.
  function readConsent() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      var data = JSON.parse(raw);
      if (!data || (data.status !== "granted" && data.status !== "denied")) {
        return null;
      }

      var ageDays = (Date.now() - (data.ts || 0)) / 86400000;
      if (ageDays > MAX_AGE_DAYS) return null; // abgelaufen -> erneut fragen

      return data.status;
    } catch (e) {
      return null;
    }
  }

  function writeConsent(status) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ status: status, ts: Date.now() })
      );
    } catch (e) {
      /* Ohne Speicher fragen wir beim nächsten Aufruf erneut. */
    }
  }

  function clearConsent() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  /* ---------- Google Ads erst nach Einwilligung laden --------------------- */

  var tagLoaded = false;

  function loadGoogleAds() {
    if (tagLoaded || document.getElementById("gtag-script")) return;
    tagLoaded = true;

    var s = document.createElement("script");
    s.id = "gtag-script";
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + ADS_ID;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", ADS_ID);
  }

  /* ---------- Banner ------------------------------------------------------ */

  // Die Rechtsseiten liegen im Wurzelverzeichnis, /training/ eine Ebene tiefer.
  function privacyHref() {
    return window.location.pathname.indexOf("/training/") !== -1
      ? "../Datenschutz.html"
      : "Datenschutz.html";
  }

  function removeBanner() {
    var el = document.getElementById("consent-banner");
    if (el) el.parentNode.removeChild(el);
  }

  function showBanner() {
    if (document.getElementById("consent-banner")) return;

    var banner = document.createElement("div");
    banner.id = "consent-banner";
    banner.className = "consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Hinweis zum Datenschutz");

    banner.innerHTML =
      '<div class="consent-inner">' +
      '<div class="consent-text">' +
      "<h2>Darf es etwas Statistik sein?</h2>" +
      "<p>Diese Website nutzt Google Ads, um zu messen, ob unsere Anzeigen " +
      "funktionieren. Dabei werden Daten an Google übertragen und Cookies " +
      "gesetzt. Das passiert nur, wenn Sie zustimmen &ndash; für den Betrieb " +
      "der Seite ist es nicht nötig. Sie können Ihre Entscheidung jederzeit " +
      "in der <a>Datenschutzerklärung</a> ändern.</p>" +
      "</div>" +
      '<div class="consent-actions">' +
      '<button type="button" class="consent-btn" data-consent="denied">Ablehnen</button>' +
      '<button type="button" class="consent-btn" data-consent="granted">Akzeptieren</button>' +
      "</div>" +
      "</div>";

    // href erst hier setzen, damit im Markup-String kein Pfad hartkodiert ist
    var link = banner.querySelector(".consent-text a");
    link.setAttribute("href", privacyHref());

    banner.addEventListener("click", function (ev) {
      var btn = ev.target.closest("[data-consent]");
      if (!btn) return;

      var choice = btn.getAttribute("data-consent");
      writeConsent(choice);
      removeBanner();

      if (choice === "granted") loadGoogleAds();
      // Bei "denied" wird nichts geladen. Ein bereits geladenes Tag lässt sich
      // nicht zurücknehmen - der Widerruf wirkt daher ab dem nächsten Aufruf.
    });

    document.body.appendChild(banner);

    // Erst nach dem Einfügen animieren, damit die Transition greift
    window.requestAnimationFrame(function () {
      banner.classList.add("is-visible");
    });
  }

  /* ---------- Widerruf (Button in der Datenschutzerklärung) --------------- */

  function wireRevokeButton() {
    var btn = document.getElementById("consent-revoke");
    if (!btn) return;

    var status = document.getElementById("consent-status");

    function renderStatus() {
      if (!status) return;
      var current = readConsent();
      status.textContent =
        current === "granted"
          ? "Aktueller Stand: Sie haben eingewilligt."
          : current === "denied"
          ? "Aktueller Stand: Sie haben abgelehnt."
          : "Aktueller Stand: Es liegt keine Entscheidung vor.";
    }

    btn.addEventListener("click", function () {
      clearConsent();
      renderStatus();
      showBanner();
    });

    renderStatus();
  }

  /* ---------- Start ------------------------------------------------------- */

  function init() {
    if (readConsent() === "granted") {
      loadGoogleAds();
    } else if (readConsent() === null) {
      showBanner();
    }
    // "denied": nichts laden, nicht erneut fragen

    wireRevokeButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
