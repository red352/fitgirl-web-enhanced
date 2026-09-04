export const gameArticle = `
<article class="hentry">
  <header class="entry-header">
    <h1 class="entry-title"><a href="/sample-game/">Sample Game: Deluxe Edition</a></h1>
    <div class="entry-meta"><time class="entry-date">September 2, 2026</time></div>
  </header>
  <div class="entry-content">
    <h3>Sample Game: Deluxe Edition</h3>
    <p class="game-info">
      <img src="https://images.example/cover.jpg" alt="Sample Game cover">
      Genres/Tags: <a href="/tag/action/">Action</a>, <a href="/tag/open-world/">Open-world</a><br>
      Company: Sample Studio<br>
      Languages: ENG/MULTI8<br>
      Original Size: 52 GB<br>
      Repack Size: 21 GB
    </p>
    <h3>Download Mirrors (Direct Links)</h3>
    <ul><li><a href="https://files.example/game" target="_blank" rel="noopener">Filehoster</a></li></ul>
    <h3>Download Mirrors (Torrent)</h3>
    <ul><li><a href="magnet:?xt=urn:btih:sample">Magnet</a></li></ul>
    <h3>Screenshots</h3>
    <p>
      <a href="https://images.example/one-large.jpg"><img src="https://images.example/one.jpg" alt="Gameplay one"></a>
      <a href="https://images.example/two-large.jpg"><img src="https://images.example/two.jpg" alt="Gameplay two"></a>
      <a href="https://images.example/three-large.jpg"><img src="https://images.example/three.jpg" alt="Gameplay three"></a>
      <br>
      <a href="https://video.example/preview.mp4"><video muted loop autoplay><source src="https://video.example/preview.mp4"></video></a>
    </p>
    <h3>Repack Features</h3>
    <ul><li>Lossless repack</li><li>Selective download</li></ul>
    <div class="su-spoiler su-spoiler-closed"><div class="su-spoiler-title">Game Description</div><div class="su-spoiler-content" style="height: 0; overflow: hidden">Build your own company from the ground up.</div></div>
  </div>
</article>`;

export const specialArticle = `
<article class="hentry">
  <header class="entry-header"><h2 class="entry-title"><a href="/updates-digest/">Updates Digest</a></h2></header>
  <div class="entry-content"><p>This content must remain intact.</p></div>
</article>`;

export const upcomingArticle = `
<article class="hentry">
  <header class="entry-header"><h2 class="entry-title"><a href="/upcoming-repacks/">Upcoming Repacks</a></h2></header>
  <div class="entry-content">
    .wplp_outside { border: 1px solid red; }<br>-->
    <p><strong>Next:</strong> ${Array.from(
      { length: 12 },
      (_, index) => `<a href="/upcoming-${index + 1}/">Upcoming Game ${index + 1}</a>`,
    ).join(' · ')}</p>
  </div>
</article>`;

export const popularWidget = `
<aside id="content-sidebar"><section id="block-2"><div class="jetpack_top_posts_widget">
  <a href="/popular-one/" title="Popular One"><img src="https://images.example/popular-one.jpg" alt="Popular One alt"></a>
  <a href="/popular-two/"><img src="https://images.example/popular-two.jpg" alt="Popular Two"></a>
  <a href="/popular-three/"><img src="https://images.example/popular-three.jpg" alt=""></a>
</div></section></aside>`;

export const archiveWidget = `
<aside id="archives-2" class="widget widget_archive"><h1 class="widget-title">Monthly Archives</h1><nav aria-label="Monthly Archives"><ul>
  <li><a href="/2026/09/">September 2026</a> (7)</li><li><a href="/2026/08/">August 2026</a> (172)</li>
  <li><a href="/2025/12/">December 2025</a> (143)</li><li><a href="/2025/11/">November 2025</a> (149)</li>
</ul></nav></aside>`;

export const digestArticle = `
<article class="hentry category-updates-digest">
  <header class="entry-header"><h1 class="entry-title"><a href="/updates-digest-for-september-2-2026/">Updates Digest for September 2, 2026</a></h1></header>
  <div class="entry-content"><div style="clear: both; margin-bottom: 50px">
    <img class="alignleft" src="/test/e2e/assets/cover.svg" width="113" height="113" alt="Updates">
    <p>Today's updated repacks are collected below.</p>
    <div class="su-spoiler su-spoiler-closed"><div class="su-spoiler-title">Updated Game One</div><div class="su-spoiler-content">Patch and download details.</div></div>
    <div class="su-spoiler su-spoiler-closed"><div class="su-spoiler-title">Updated Game Two</div><div class="su-spoiler-content">More patch details.</div></div>
  </div></div>
</article>`;

export const popularPageArticle = `
<article class="hentry">
  <header class="entry-header"><h1 class="entry-title">Popular Repacks</h1></header>
  <div class="entry-content"><style>.jetpack_top_posts_widget a { float:left }</style>
    <div class="jetpack_top_posts_widget">
      ${Array.from(
        { length: 8 },
        (_, index) =>
          `<a href="/popular-${index + 1}/" title="Popular Game ${index + 1}"><img src="/test/e2e/assets/shot-${(index % 3) + 1}.svg" width="150" height="200" alt="Popular Game ${index + 1}"></a>`,
      ).join('')}
    </div>
  </div>
</article>`;

export const azPageArticle = `
<article class="hentry">
  <header class="entry-header"><h1 class="entry-title">All My Repacks (A-Z)</h1></header>
  <div class="entry-content">
    <ul class="lcp_catlist">${Array.from(
      { length: 18 },
      (_, index) =>
        `<li><a href="/game-${index + 1}/">Game ${String.fromCharCode(65 + index)} — Complete Edition</a></li>`,
    ).join('')}</ul>
    <ul class="lcp_paginator"><li><a href="?page=1">1</a></li><li><a href="?page=2">2</a></li></ul>
  </div>
</article>`;

export const updatesPageArticle = `
<article class="hentry">
  <header class="entry-header"><h1 class="entry-title">Updates List</h1></header>
  <div class="entry-content"><p>Browse recently updated repacks.</p>
    ${Array.from(
      { length: 6 },
      (_, index) =>
        `<div class="su-spoiler su-spoiler-closed"><div class="su-spoiler-title">Update group ${index + 1}</div><div class="su-spoiler-content">Update links and version notes.</div></div>`,
    ).join('')}
  </div>
</article>`;

export const siteHeader = `
<header id="masthead"><div class="header-main">
  <h1 class="site-title"><a href="/">FitGirl Repacks</a></h1>
  <nav id="site-header-menu"><button class="menu-toggle">Primary Menu</button><ul class="nav-menu">
    <li class="menu-item menu-item-has-children"><a href="/?page=popular">Popular Repacks</a><ul class="sub-menu"><li><a href="/?page=top50">Top 50 Repacks</a></li></ul></li>
    <li class="menu-item menu-item-has-children"><a href="/?page=az">All My Repacks A-Z</a><ul class="sub-menu"><li><a href="/?page=pink">Pink Paw Award</a></li></ul></li>
    <li class="menu-item menu-item-has-children"><a href="/?page=updates">Updates List</a><ul class="sub-menu"><li><a href="/?page=digest">Updates Digest</a></li></ul></li>
    <li class="menu-item"><a href="/?page=faq">FAQ</a></li><li class="menu-item"><a href="/?page=donate">Donate</a></li>
  </ul></nav>
  <button class="search-toggle">Search</button><div id="search-container"><form class="search-form"><input name="s"></form></div>
</div></header>`;

export const pinkPawGameArticle = `
<article class="post-63640 post type-post status-publish format-standard hentry category-lossless-repack category-pink-paw-award">
  <header class="entry-header">
    <h1 class="entry-title"><a href="/the-alters/">The Alters: Deluxe Edition</a></h1>
    <div class="entry-meta"><time class="entry-date">September 2, 2026</time></div>
  </header>
  <div class="entry-content">
    <div style="background: url(https://fitgirl-repacks.site/wp-content/uploads/2022/08/paw.png) top right no-repeat">
      <h3>#5771 The Alters: Deluxe Edition</h3>
      <p style="height: 200px; display: block;">
        <a href="https://example.com/cover"><img src="https://images.example/alters-cover.jpg" alt="The Alters cover"></a>
        Genres/Tags: Adventure, Management<br>
        Company: 11 bit studios<br>
        Languages: ENG/MULTI12<br>
        Original Size: 64.7 GB<br>
        Repack Size: 43.6 GB
      </p>
      <h3>Download Mirrors (Direct Links)</h3>
      <ul><li><a href="https://files.example/alters">Filehoster</a></li></ul>
      <h3>Download Mirrors (Torrent)</h3>
      <ul><li><a href="magnet:?xt=urn:btih:alters">Magnet</a></li></ul>
      <h3>Screenshots (Click to enlarge)</h3>
      <p>
        <a href="https://images.example/alters-1.jpg"><img src="https://images.example/alters-1-thumb.jpg"></a>
        <a href="https://images.example/alters-2.jpg"><img src="https://images.example/alters-2-thumb.jpg"></a>
      </p>
      <h3>Repack Features</h3>
      <ul><li>Lossless repack</li><li>4 DLCs included</li></ul>
      <div class="su-spoiler su-spoiler-closed"><div class="su-spoiler-title">Game Description</div><div class="su-spoiler-content">Survival on a hostile planet.</div></div>
    </div>
    <p><b>Backwards Compatibility</b></p>
    <p>This repack is not backwards compatible.</p>
  </div>
</article>`;

export const fullPage = `
${siteHeader}
<div id="page"><main id="main"><div id="primary"><div id="content">${upcomingArticle}${gameArticle}${gameArticle.replaceAll('Sample Game', 'Second Game')}${specialArticle}</div></div></main>${popularWidget}${archiveWidget}</div>`;
