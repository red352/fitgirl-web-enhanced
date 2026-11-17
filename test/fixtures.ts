export const gameArticle = `
<article class="post-83718 post type-post status-publish format-standard hentry category-lossless-repack">
  <header class="entry-header">
    <div class="entry-meta"><span class="cat-links"><a href="/category/lossless-repack/" rel="category tag">Lossless Repack</a>, <a href="/category/pink-paw-award/" rel="category tag">Pink Paw Award</a></span></div>
    <h1 class="entry-title"><a href="/sample-game/">Sample Game: Deluxe Edition</a></h1>
    <div class="entry-meta"><span class="entry-date"><a href="/sample-game/" rel="bookmark"><time class="entry-date" datetime="2026-09-02T10:00:00+00:00">September 2, 2026</time></a></span> <span class="byline"><span class="author vcard"><a class="url fn n" href="/author/fitgirl/" rel="author">FitGirl</a></span></span> <span class="comments-link"><a href="/sample-game/#respond"><span class="tolstoycomments-cc" data-url="https://fitgirl-repacks.site/sample-game/"><i class="fa fa-comment"></i> 37 comments</span></a></span></div>
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
      <a href="https://images.example/four-large.jpg"><img src="https://images.example/four.jpg" alt="Gameplay four"></a>
      <a href="https://images.example/five-large.jpg"><img src="https://images.example/five.jpg" alt="Gameplay five"></a>
      <br>
      <a href="https://video.example/preview.mp4"><video muted loop autoplay><source src="https://video.example/preview.mp4"></video></a>
    </p>
    <h3>Repack Features</h3>
    <ul><li>Lossless repack</li><li>Selective download</li></ul>
    <div class="su-spoiler su-spoiler-closed"><div class="su-spoiler-title">Game Description</div><div class="su-spoiler-content" style="height: 0; overflow: hidden">Build your own company from the ground up.</div></div>
  </div>
</article>`;

export const specialArticle = `
<article class="post-83697 post type-post status-publish format-standard hentry category-updates-digest">
  <header class="entry-header"><h2 class="entry-title"><a href="/updates-digest/">Updates Digest</a></h2></header>
  <div class="entry-content"><p>This content must remain intact.</p></div>
</article>`;

export const upcomingArticle = `
<article class="post-68049 post type-post status-publish format-standard hentry category-uncategorized">
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
    <div class="entry-meta"><span class="cat-links"><a href="/category/lossless-repack/" rel="category tag">Lossless Repack</a></span></div>
    <h1 class="entry-title"><a href="/the-alters/">The Alters: Deluxe Edition</a></h1>
    <div class="entry-meta"><span class="entry-date"><a href="/the-alters/" rel="bookmark"><time class="entry-date" datetime="2026-09-02T10:00:00+00:00">September 2, 2026</time></a></span> <span class="byline"><span class="author vcard"><a class="url fn n" href="/author/fitgirl/" rel="author">FitGirl</a></span></span> <span class="comments-link"><a href="/the-alters/#respond"><span class="tolstoycomments-cc" data-url="https://fitgirl-repacks.site/the-alters/"><i class="fa fa-comment"></i> 12 comments</span></a></span></div>
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

export const siteSidebarExtras = `
<aside id="secondary" class="sidebar-primary">
  <h2 class="site-description">The ONLY official site for FitGirl Repacks. Every single FG repack installer has a link inside, which leads here. Do not fall for fake and scam sites, which are using my name.</h2>
  <div id="primary-sidebar">
    <aside id="custom_html-5" class="widget_text widget widget_custom_html">
      <h1 class="widget-title">Support the Cause</h1>
      <div class="textwidget custom-html-widget"><p>Running this site takes time and bandwidth. If my repacks helped you, consider supporting the cause.</p></div>
    </aside>
    <aside id="custom_html-2" class="widget_text widget widget_custom_html">
      <h1 class="widget-title">My RSS Feed</h1>
      <div class="textwidget custom-html-widget"><p>Subscribe to this RSS feed and get the latest updates automatically: <a href="/feed/">FitGirl RSS Feed</a></p></div>
    </aside>
    <aside id="blog_subscription-2" class="widget widget_blog_subscription jetpack_subscription_widget">
      <h1 class="widget-title">Subscribe to my releases via Email</h1>
      <div class="wp-block-jetpack-subscriptions__container">
        <form class="jetpack_subscription_widget" action="/subscribe/" method="post">
          <label for="subscribe-field-3">Email address</label>
          <div id="subscribe-text"><p>Enter your email address to subscribe to this blog and receive notifications of new posts by email.</p></div>
          <input id="subscribe-field-3" type="email" name="email" placeholder="your@email.com" required>
          <button type="submit">Subscribe</button>
        </form>
      </div>
    </aside>
    ${archiveWidget}
    <aside id="custom_html-4" class="widget_text widget widget_custom_html">
      <h1 class="widget-title">Press Play for my OST</h1>
      <div class="textwidget custom-html-widget"><p><iframe src="https://www.youtube.com/embed/72QAAOaYW2M" allowfullscreen width="90%" frameborder="0"></iframe><br> <br> or original version for Japanese games<br> <br><iframe src="https://www.youtube.com/embed/IFzUTKsrbN8" allowfullscreen width="90%" frameborder="0"></iframe></p></div>
    </aside>
  </div>
</aside>`;

export const siteFooterExtras = `
<footer id="colophon" class="site-footer"><div id="supplementary"><div id="footer-sidebar" class="footer-sidebar">
  <aside id="block-6" class="widget widget_block">
    <style>.footer-grid .widget-grid-view-image { float: left; max-width: 17%; margin-right: 5px; }</style>
    <div class="footer-grid"><div class="jetpack_top_posts_widget">
      <h2 class="widgettitle">Today’s Most Popular Repacks</h2>
      <div class="widgets-grid-layout no-grav">${Array.from(
        { length: 10 },
        (_, index) =>
          `<div class="widget-grid-view-image"><a href="/today-popular-${index + 1}/" title="Today Popular Game ${index + 1}" class="bump-view" data-bump-view="tp"><img decoding="async" loading="lazy" width="150" height="200" src="/test/e2e/assets/shot-${(index % 3) + 1}.svg" alt="Today Popular Game ${index + 1}"></a></div>`,
      ).join('')}</div>
    </div></div>
  </aside>
</div></div><div class="site-info">Proudly powered by WordPress</div></footer>`;

export const postNavigation = `
<nav class="navigation post-navigation"><h1 class="screen-reader-text">Post navigation</h1><div class="nav-links"><a href="/previous-game/" rel="prev"><span class="meta-nav">Previous Post</span>Previous Game: Complete Edition</a><a href="/next-game/" rel="next"><span class="meta-nav">Next Post</span>Next Game: Definitive Edition</a></div></nav>`;

/** 详情页评论区：Tolstoy 插件挂载点（线上位于 post-navigation 之后） */
export const commentsSection = `
<div data-source-theme="tolstoycomments"><div id="comments"></div></div>
<div class="tolstoycomments-feed"></div>`;

const makeArchiveArticle = (index: number): string =>
  gameArticle
    .replaceAll('Sample Game', `Archive Game ${index}`)
    .replace('class="post-83718', `id="post-8510${index}" class="post-8510${index}`);

const archiveNav = (nextHref: string): string =>
  `<nav class="navigation paging-navigation"><h1 class="screen-reader-text">Posts navigation</h1><div class="nav-links">${
    nextHref
      ? `<a href="${nextHref}" class="next" rel="next"><span class="meta-nav">Next</span></a>`
      : ''
  }</div></nav>`;

/** 归档列表页的 `#content` 内容：两篇游戏卡 + 指向 /page/2/ 的分页导航 */
export const archiveListingContent = `${makeArchiveArticle(1)}${makeArchiveArticle(2)}${archiveNav('/page/2/')}`;

/** 第 2 页的 `#content` 内容：另外两篇游戏卡 + 指向 /page/3/ 的分页导航 */
export const archiveListingPage2Content = `${makeArchiveArticle(3)}${makeArchiveArticle(4)}${archiveNav('/page/3/')}`;

/** 归档列表页：两篇游戏卡 + 指向 /page/2/ 的分页导航 */
export const archiveListingPage = `
${siteHeader}
<div id="page"><main id="main"><div id="primary"><div id="content" class="site-content">${archiveListingContent}</div></div>${siteSidebarExtras}</main>${siteFooterExtras}</div>`;

/** 第 2 页：另外两篇游戏卡 + 指向 /page/3/ 的分页导航（用于验证导航被更新） */
export const archiveListingPage2 = `
<div id="page"><main id="main"><div id="primary"><div id="content" class="site-content">${archiveListingPage2Content}</div></div></main></div>`;

/** 带粉爪嘉奖的游戏卡列表页，用于验证卡片头部层级 */
export const pinkPawStreamPage = `
${siteHeader}
<div id="page"><main id="main"><div id="primary"><div id="content" class="site-content">${pinkPawGameArticle}</div></div>${siteSidebarExtras}</main>${siteFooterExtras}</div>`;

/** 把 fixture 里的日期改写为「今天」，用于验证相对时间分支 */
export const withTodayDate = (html: string): string => {
  const now = new Date();
  const iso = now.toISOString().slice(0, 19) + '+00:00';
  const absolute = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  return html
    .replace('datetime="2026-09-02T10:00:00+00:00"', `datetime="${iso}"`)
    .replace('September 2, 2026', absolute);
};

export const fullPage = `
${siteHeader}
<div id="page"><main id="main"><div id="primary"><div id="content" class="site-content">${upcomingArticle}${gameArticle}${gameArticle.replaceAll('Sample Game', 'Second Game')}${specialArticle}</div></div>${siteSidebarExtras}</main>${popularWidget}${siteFooterExtras}</div>`;
