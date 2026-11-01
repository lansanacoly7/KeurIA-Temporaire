// Script d'initialisation immédiate du zoom d'affichage pour éviter tout flash de rendu (FOUC).
// Exécuté dans le <head> avant le premier affichage de la page.

export default function DisplayZoomScript() {
  const inlineCode = `(function() {
    try {
      var saved = localStorage.getItem('keria_display_zoom');
      if (saved && saved !== 'auto') {
        document.documentElement.setAttribute('data-display-zoom', saved);
        var zoomMap = { 'compact': '0.85', 'standard': '1', 'comfortable': '1.1' };
        if (zoomMap[saved]) {
          document.documentElement.style.setProperty('--app-zoom', zoomMap[saved]);
        }
      }
    } catch(e) {}
  })();`;

  return <script dangerouslySetInnerHTML={{ __html: inlineCode }} />;
}
