<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>MEPC Commander</title>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&family=Barlow+Condensed:wght@500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="./src/styles/styles.css" />

  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
</head>
<body>
  <div id="app-shell">
    <aside id="sidebar">
      <div id="sidebar-logo" class="sidebar-logo"></div>
      <nav id="sidebar-nav" class="sidebar-nav"></nav>
    </aside>

    <main id="main-wrap">
      <header id="topbar">
        <div id="topbar-title">MEPC Commander</div>
        <div class="topbar-spacer"></div>
        <div id="topbar-user"></div>
        <button id="topbar-refresh" class="btn btn-sm btn-secondary" type="button">Refresh</button>
      </header>

      <section id="content"></section>
    </main>
  </div>

  

  <div id="modal-overlay" hidden>
    <div id="modal-box" class="modal-box">
      <div id="modal-header" class="modal-header"></div>
      <div id="modal-body" class="modal-body"></div>
      <div id="modal-footer" class="modal-footer"></div>
    </div>
  </div>

  <div id="toast-area"></div>

  <script type="module" src="./src/app/app.js"></script>
</body>
</html>
