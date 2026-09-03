// ==UserScript==
// @name         FitGirl Web Enhanced
// @namespace    https://github.com/red352/fitgirl-web-enhanced
// @version      1.4.1
// @author       red352
// @description  优化 FitGirl Repacks 的信息密度、宽屏布局、折叠内容与热门榜单。
// @license      MIT
// @homepageURL  https://github.com/red352/fitgirl-web-enhanced
// @supportURL   https://github.com/red352/fitgirl-web-enhanced/issues
// @downloadURL  https://raw.githubusercontent.com/red352/fitgirl-web-enhanced/master/dist/fitgirl-enhanced.user.js
// @updateURL    https://raw.githubusercontent.com/red352/fitgirl-web-enhanced/master/dist/fitgirl-enhanced.user.js
// @match        https://fitgirl-repacks.site/*
// @grant        none
// @run-at       document-start
// @noframes
// ==/UserScript==

(function() {
	"use strict";
	var s = new Set();
	var _css = async (t) => {
		if (s.has(t)) return;
		s.add(t);
		((c) => {
			if (typeof GM_addStyle === "function") GM_addStyle(c);
			else (document.head || document.documentElement).appendChild(document.createElement("style")).append(c);
		})(t);
	};
	_css(":root{--fwe-ink:#1b1b1f;--fwe-muted:#69676d;--fwe-paper:#f5f3ef;--fwe-card:#fffdf9;--fwe-line:#ded9d2;--fwe-pink:#d60072;--fwe-green:#638100;--fwe-header:#08080a;--fwe-shadow:0 14px 36px #1b1b1f14;--fwe-radius:5px}.fwe-icon{flex:none;width:1.15rem;height:1.15rem}.fwe-search,.fwe-popular-button,.fwe-browse-button,.fwe-view-control,.fwe-popular-dialog,.fwe-browse-dialog{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif}.fwe-view-control{z-index:50;color:var(--fwe-ink);position:relative}.fwe-view-control__trigger,.fwe-browse-button,.fwe-popular-button{box-sizing:border-box;color:#fff;letter-spacing:.03em;cursor:pointer;background:0 0;border:1px solid #ffffff38;border-radius:3px;justify-content:center;align-items:center;gap:.5rem;min-height:2.75rem;padding:.55rem .75rem;font-size:.78rem;font-weight:750;list-style:none;display:inline-flex}.fwe-view-control__trigger::-webkit-details-marker{display:none}.fwe-view-control__panel{border:1px solid var(--fwe-line);border-radius:var(--fwe-radius);width:min(20rem,100vw - 2rem);color:var(--fwe-ink);background:var(--fwe-card);box-shadow:var(--fwe-shadow);padding:.75rem;position:absolute;top:calc(100% + .45rem);right:0}.fwe-view-control__row{justify-content:space-between;align-items:center;gap:1rem;min-height:2.75rem;display:flex}.fwe-view-control__row+.fwe-view-control__row{border-top:1px solid var(--fwe-line);margin-top:.25rem;padding-top:.25rem}.fwe-view-control__label{font-size:.82rem;font-weight:800}.fwe-switch{cursor:pointer;background:0 0;border:0;width:3.25rem;height:2.75rem;padding:0;position:relative}.fwe-switch:before{content:\"\";background:#9c989b;border-radius:999px;width:3rem;height:1.7rem;transition:background-color .16s;position:absolute;top:.525rem;left:.125rem}.fwe-switch[aria-checked=true]:before{background:var(--fwe-pink)}.fwe-switch__thumb{background:#fff;border-radius:50%;width:1.3rem;height:1.3rem;transition:transform .16s;position:absolute;top:.725rem;left:.325rem;box-shadow:0 1px 4px #00000059}.fwe-switch[aria-checked=true] .fwe-switch__thumb{transform:translate(1.3rem)}.fwe-icon-button{width:2.75rem;height:2.75rem;color:inherit;cursor:pointer;background:0 0;border:0;border-radius:50%;place-items:center;padding:0;display:inline-grid}.fwe-popular-dialog,.fwe-browse-dialog{box-sizing:border-box;width:min(25rem,100vw);max-width:none;height:100dvh;max-height:none;color:var(--fwe-ink);background:var(--fwe-card);border:0;margin:0 0 0 auto;padding:0;box-shadow:-18px 0 48px #0000003d}.fwe-lightbox-dialog{box-sizing:border-box;z-index:1000;color:#fff;background:0 0;border:0;justify-content:center;align-items:center;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;margin:0;padding:0;display:none;position:fixed;inset:0;overflow:hidden}.fwe-lightbox-dialog[open]{display:flex}.fwe-lightbox-dialog::backdrop{-webkit-backdrop-filter:blur(28px)saturate(190%);background:#08080ccc}.fwe-lightbox{-webkit-backdrop-filter:blur(32px)saturate(200%);background:#121218d9;border:1px solid #ffffff29;border-radius:16px;flex-direction:column;width:min(92vw,1360px);height:min(88dvh,880px);animation:.22s cubic-bezier(.16,1,.3,1) fwe-lightbox-pop;display:flex;position:relative;overflow:hidden;box-shadow:0 32px 80px #000000b3,inset 0 0 0 1px #ffffff1a}@keyframes fwe-lightbox-pop{0%{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}.fwe-lightbox__header{box-sizing:border-box;background:#0c0c10bf;border-bottom:1px solid #ffffff1a;flex:none;justify-content:space-between;align-items:center;gap:1rem;height:3.25rem;padding:0 1.25rem;display:flex}.fwe-lightbox__meta{align-items:center;gap:.75rem;display:flex}.fwe-lightbox__counter{color:#ffffffd9;font-variant-numeric:tabular-nums;letter-spacing:.05em;font-size:.85rem;font-weight:700}.fwe-lightbox__hd-badge{letter-spacing:.04em;text-transform:uppercase;-webkit-user-select:none;user-select:none;border:1px solid #ffffff2e;border-radius:999px;align-items:center;gap:.3rem;padding:.2rem .55rem;font-size:.68rem;font-weight:800;transition:all .2s;display:inline-flex}.fwe-lightbox__hd-badge--loading{color:#ffb834;background:#ffaa001f;border-color:#fa06;animation:1.2s ease-in-out infinite alternate fwe-hd-pulse}.fwe-lightbox__hd-badge--ready{color:#00dc82;background:#00dc8224;border-color:#00dc8273;box-shadow:0 0 12px #00dc8240}.fwe-lightbox__hd-badge--video{color:#ff3ba4;background:#ff3ba424;border-color:#ff3ba473}@keyframes fwe-hd-pulse{0%{opacity:.6}to{opacity:1}}.fwe-lightbox__toolbar{-webkit-backdrop-filter:blur(12px);background:#ffffff0f;border:1px solid #ffffff1f;border-radius:999px;align-items:center;gap:.35rem;padding:.2rem .4rem;display:flex}.fwe-lightbox__zoom-indicator{color:#ffffffd9;font-variant-numeric:tabular-nums;letter-spacing:.03em;text-align:center;cursor:pointer;-webkit-user-select:none;user-select:none;background:0 0;border:0;border-radius:999px;min-width:3.2rem;padding:.25rem .45rem;font-size:.75rem;font-weight:750;transition:background-color .15s,color .15s}.fwe-lightbox__zoom-indicator:hover{color:#fff;background:#ffffff24}.fwe-lightbox__zoom-indicator:focus-visible{outline:2px solid #ff3ba4}.fwe-lightbox__actions{align-items:center;gap:.5rem;display:flex}.fwe-lightbox__btn,a.fwe-lightbox__btn{box-sizing:border-box;cursor:pointer;justify-content:center;align-items:center;width:2.25rem;height:2.25rem;padding:0;transition:background-color .15s,border-color .15s,transform .15s;display:inline-flex;box-shadow:none!important;color:#fff!important;background:#ffffff1a!important;border:1px solid #ffffff29!important;border-radius:999px!important;outline:none!important;text-decoration:none!important}.fwe-lightbox__btn:hover,a.fwe-lightbox__btn:hover{transform:scale(1.06);background:#ffffff3d!important;border-color:#fff6!important}.fwe-lightbox__btn:focus-visible,a.fwe-lightbox__btn:focus-visible{outline-offset:2px!important;outline:2px solid #ff3ba4!important}.fwe-lightbox__btn--close:hover{background:#d60072!important;border-color:#ff3ba4!important}.fwe-lightbox__body{box-sizing:border-box;flex:1;justify-content:center;align-items:center;width:100%;height:calc(100% - 3.25rem);padding:1.25rem;display:flex;position:relative;overflow:hidden}.fwe-lightbox__nav{z-index:10;box-sizing:border-box;color:#fff;-webkit-backdrop-filter:blur(14px);cursor:pointer;background:#0f0f16bf;border:1px solid #fff3;border-radius:999px;justify-content:center;align-items:center;width:3rem;height:3rem;padding:0;transition:background-color .15s,border-color .15s,transform .15s;display:inline-flex;position:absolute;top:50%;transform:translateY(-50%)}.fwe-lightbox__nav--prev{left:1.25rem}.fwe-lightbox__nav--next{right:1.25rem}.fwe-lightbox__nav:hover{background:#ffffff47;border-color:#ffffff80;transform:translateY(-50%)scale(1.08)}.fwe-lightbox__nav:focus-visible{outline-offset:2px;outline:2px solid #ff3ba4}.fwe-lightbox__stage{touch-action:none;-webkit-user-select:none;user-select:none;justify-content:center;align-items:center;width:100%;height:100%;display:flex;position:relative;overflow:hidden}.fwe-lightbox__stage.is-dragging{cursor:grabbing!important}.fwe-lightbox__image{object-fit:contain;-webkit-user-select:none;user-select:none;will-change:transform;transform-origin:50%;border-radius:8px;width:auto;max-width:100%;height:auto;max-height:100%;transition:opacity .2s,transform 80ms ease-out;display:block;box-shadow:0 16px 48px #000000a6}.fwe-lightbox__video{object-fit:contain;will-change:transform;transform-origin:50%;border-radius:8px;width:auto;max-width:100%;height:auto;max-height:100%;transition:transform 80ms ease-out;display:block;box-shadow:0 16px 48px #000000a6}@media (width<=768px){.fwe-lightbox{border:0;border-radius:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh}.fwe-lightbox__body{padding:.5rem}.fwe-lightbox__nav{width:2.5rem;height:2.5rem}.fwe-lightbox__nav--prev{left:.5rem}.fwe-lightbox__nav--next{right:.5rem}}html[data-fwe-mode=original] .fwe-lightbox-dialog,html[data-fwe-mode=original] .fwe-game-dialog{display:none!important}.fwe-popular-dialog[open],.fwe-browse-dialog[open]{flex-direction:column;animation:.18s ease-out fwe-drawer-in;display:flex}.fwe-popular-dialog::backdrop,.fwe-browse-dialog::backdrop{-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);background:#06060894}@keyframes fwe-drawer-in{0%{transform:translate(100%)}}.fwe-dialog__header{border-bottom:1px solid var(--fwe-line);justify-content:space-between;align-items:flex-start;gap:1rem;padding:1.5rem;display:flex}.fwe-dialog__header h2,.fwe-archives h2{color:var(--fwe-ink);margin:0;font-family:Georgia,Times New Roman,serif;font-size:1.35rem;line-height:1.15}.fwe-popular-list,.fwe-browse-dialog__content{margin:0;padding:.85rem 1rem 2rem;overflow:auto}.fwe-popular-list{list-style:none}.fwe-popular-item{border-bottom:1px solid var(--fwe-line);margin:0}.fwe-popular-item__link{min-height:5.7rem;color:var(--fwe-ink);grid-template-columns:2.1rem 4.25rem minmax(0,1fr);align-items:center;gap:.75rem;padding:.65rem .25rem;text-decoration:none;display:grid}.fwe-popular-item__rank{color:var(--fwe-pink);font-family:Georgia,serif;font-size:1.15rem;font-weight:700}.fwe-popular-item__image{object-fit:cover;background:#e5e1db;border-radius:2px;width:4.25rem;height:4.25rem}.fwe-popular-item__title{font-size:.86rem;font-weight:720;line-height:1.35}.fwe-browse-nav,.fwe-browse-nav ul,.fwe-archives ul{margin:0;padding:0;list-style:none}.fwe-browse-nav>li{border-bottom:1px solid var(--fwe-line);margin:0}.fwe-browse-nav a{min-height:2.75rem;color:var(--fwe-ink);align-items:center;font-size:.84rem;font-weight:750;text-decoration:none;display:flex}.fwe-browse-nav ul{padding:0 0 .5rem .9rem}.fwe-browse-nav ul a{min-height:2.3rem;color:var(--fwe-muted);font-size:.76rem;font-weight:600}.fwe-archives{margin-top:1.5rem}.fwe-archive-year{border-bottom:1px solid var(--fwe-line)}.fwe-archive-year>summary{min-height:2.75rem;color:var(--fwe-ink);cursor:pointer;align-items:center;font-weight:780;display:flex}.fwe-archive-year li{justify-content:space-between;align-items:center;gap:.75rem;min-height:2.25rem;display:flex}.fwe-archive-year a{color:var(--fwe-green);font-size:.78rem;text-decoration:none}.fwe-archive-count{color:var(--fwe-muted);font-size:.72rem}.fwe-switch:focus-visible,.fwe-view-control__trigger:focus-visible,.fwe-icon-button:focus-visible,.fwe-browse-button:focus-visible,.fwe-popular-button:focus-visible,.fwe-search__submit:focus-visible,html[data-fwe-mode=enhanced] a:focus-visible,html[data-fwe-mode=enhanced] summary:focus-visible{outline-offset:3px;outline:3px solid #ff3ba4}html[data-fwe-mode=original] .fwe-search,html[data-fwe-mode=original] .fwe-popular-button,html[data-fwe-mode=original] .fwe-browse-button,html[data-fwe-mode=original] .fwe-popular-dialog,html[data-fwe-mode=original] .fwe-browse-dialog{display:none!important}html[data-fwe-mode=original] .fwe-view-control{right:max(.75rem, env(safe-area-inset-right));bottom:max(.75rem, env(safe-area-inset-bottom));position:fixed}html[data-fwe-mode=original] .fwe-view-control__panel{top:auto;bottom:calc(100% + .45rem)}html[data-fwe-mode=original] .fwe-view-control__trigger{border-color:var(--fwe-line);min-width:2.75rem;color:var(--fwe-ink);background:var(--fwe-card);box-shadow:var(--fwe-shadow)}html[data-fwe-mode=original] .fwe-view-control__trigger span{display:none}html[data-fwe-mode=enhanced]{--lightningcss-light:initial;--lightningcss-dark: ;color-scheme:light;background:var(--fwe-paper)}html[data-fwe-mode=enhanced] body{color:var(--fwe-ink);background:var(--fwe-paper);font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;overflow-x:hidden}html[data-fwe-mode=enhanced] #page{background:0 0;width:100%;max-width:none;margin:0}html[data-fwe-mode=enhanced] #page:before,html[data-fwe-mode=enhanced] #page:after,html[data-fwe-mode=enhanced] #main:before,html[data-fwe-mode=enhanced] #main:after,html[data-fwe-mode=enhanced] #primary:before,html[data-fwe-mode=enhanced] #primary:after,html[data-fwe-mode=enhanced] #content:before,html[data-fwe-mode=enhanced] #content:after,html[data-fwe-mode=enhanced] .fwe-stream:before,html[data-fwe-mode=enhanced] .fwe-stream:after,html[data-fwe-mode=enhanced] #secondary,html[data-fwe-mode=enhanced] #primary-sidebar,html[data-fwe-mode=enhanced] #content-sidebar,html[data-fwe-mode=enhanced] .widget-area,html[data-fwe-mode=enhanced] #colophon,html[data-fwe-mode=enhanced] .fwe-source-hidden,html[data-fwe-mode=enhanced] .search-toggle,html[data-fwe-mode=enhanced] #search-container,html[data-fwe-mode=enhanced] .search-box-wrapper{content:none!important;display:none!important}html[data-fwe-mode=enhanced] #masthead{z-index:30;color:#fff;background:var(--fwe-header);width:100%;max-width:none;min-height:4.25rem;margin:0;padding:0;position:relative}html[data-fwe-mode=enhanced] #masthead .header-main,html[data-fwe-mode=enhanced] #masthead .site-header-main{box-sizing:border-box;align-items:center;gap:.5rem;width:min(100%,140rem);min-height:4.25rem;margin:0 auto;padding:0 clamp(1rem,2.8vw,2.5rem);display:flex}html[data-fwe-mode=enhanced] #masthead .site-branding,html[data-fwe-mode=enhanced] .site-branding{flex-direction:column;justify-content:center;display:flex}html[data-fwe-mode=enhanced] #masthead .site-title,html[data-fwe-mode=enhanced] .site-title{text-transform:uppercase!important;letter-spacing:.046875em!important;white-space:nowrap!important;margin:0!important;font-family:Montserrat,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif!important;font-size:clamp(1.25rem,2vw,1.75rem)!important;font-weight:700!important;line-height:1.2!important}html[data-fwe-mode=enhanced] #masthead .site-title a,html[data-fwe-mode=enhanced] .site-title a{transition:color .15s;color:#fff!important;text-decoration:none!important}html[data-fwe-mode=enhanced] #masthead .site-title a:hover,html[data-fwe-mode=enhanced] #masthead .site-title a:focus,html[data-fwe-mode=enhanced] .site-title a:hover,html[data-fwe-mode=enhanced] .site-title a:focus{color:#ff168d!important}html[data-fwe-mode=enhanced] .site-description{display:none}html[data-fwe-mode=enhanced] #site-header-menu,html[data-fwe-mode=enhanced] #masthead .primary-navigation{flex:1;min-width:0;display:block;overflow:visible}html[data-fwe-mode=enhanced] #site-header-menu .menu-toggle,html[data-fwe-mode=enhanced] #masthead .primary-navigation .menu-toggle{display:none}html[data-fwe-mode=enhanced] #site-header-menu .nav-menu,html[data-fwe-mode=enhanced] #masthead .primary-navigation .nav-menu{align-items:center;gap:clamp(.7rem,1.3vw,1.2rem);margin:0;padding:0;list-style:none;display:flex}html[data-fwe-mode=enhanced] #site-header-menu .nav-menu>li,html[data-fwe-mode=enhanced] #masthead .primary-navigation .nav-menu>li{float:none;margin:0;display:block;position:relative}html[data-fwe-mode=enhanced] .fwe-nav-overflow{display:none!important}html[data-fwe-mode=enhanced] #site-header-menu a,html[data-fwe-mode=enhanced] #masthead .primary-navigation a{color:#f6f4f1;white-space:nowrap;font-size:.72rem;font-weight:750;text-decoration:none}html[data-fwe-mode=enhanced] #site-header-menu .sub-menu,html[data-fwe-mode=enhanced] #masthead .primary-navigation .sub-menu{z-index:60;background:#161419;border:1px solid #ffffff29;border-radius:3px;min-width:14rem;margin:0;padding:.45rem;list-style:none;display:none;position:absolute;top:calc(100% + .85rem);left:-.75rem;box-shadow:0 12px 30px #00000047}html[data-fwe-mode=enhanced] #site-header-menu .sub-menu:before,html[data-fwe-mode=enhanced] #masthead .primary-navigation .sub-menu:before{content:\"\";height:1rem;position:absolute;top:-1rem;left:0;right:0}html[data-fwe-mode=enhanced] #site-header-menu .menu-item:hover>.sub-menu,html[data-fwe-mode=enhanced] #site-header-menu .menu-item:focus-within>.sub-menu,html[data-fwe-mode=enhanced] #masthead .primary-navigation .menu-item:hover>.sub-menu,html[data-fwe-mode=enhanced] #masthead .primary-navigation .menu-item:focus-within>.sub-menu{display:block}html[data-fwe-mode=enhanced] #site-header-menu .sub-menu a,html[data-fwe-mode=enhanced] #masthead .primary-navigation .sub-menu a{white-space:normal;border-radius:2px;align-items:center;min-height:2.4rem;padding:0 .55rem;transition:color .15s,background-color .15s;display:flex}html[data-fwe-mode=enhanced] #site-header-menu a:hover,html[data-fwe-mode=enhanced] #masthead .primary-navigation a:hover{color:#ff3ba4}html[data-fwe-mode=enhanced] #site-header-menu .sub-menu a:hover,html[data-fwe-mode=enhanced] #masthead .primary-navigation .sub-menu a:hover{color:#ff3ba4;background:#ffffff14}html[data-fwe-mode=enhanced] .fwe-search{box-sizing:border-box;background:#ffffff14;border:1px solid #ffffff38;border-radius:3px;align-items:center;width:clamp(9.5rem,14vw,13rem);min-height:2.75rem;display:flex;overflow:hidden}.fwe-search__input{box-sizing:border-box;color:#fff;min-width:0;height:2.75rem;font:inherit;background:0 0;border:0;outline:0;flex:1;padding:0 .7rem;font-size:.76rem}.fwe-search__input::placeholder{color:#ffffff9e}.fwe-search:focus-within{border-color:#ff3ba4;box-shadow:0 0 0 2px #ff3ba438}.fwe-search__submit{color:#fff;cursor:pointer;background:0 0;border:0;flex:0 0 2.75rem;place-items:center;width:2.75rem;height:2.75rem;padding:0;display:inline-grid}html[data-fwe-mode=enhanced] #main,html[data-fwe-mode=enhanced] #primary,html[data-fwe-mode=enhanced] #content{box-sizing:border-box;float:none;width:100%;max-width:none;margin:0}html[data-fwe-mode=enhanced] #primary,html[data-fwe-mode=enhanced] #content,html[data-fwe-mode=enhanced] .content-area,html[data-fwe-mode=enhanced] .site-content{padding-top:0}html[data-fwe-mode=enhanced] #main{padding:1rem 0 4rem}html[data-fwe-mode=enhanced] #content{flex-direction:column;gap:1.25rem;width:min(100% - clamp(2rem,5vw,5rem),140rem);margin-inline:auto;display:flex}html[data-fwe-mode=enhanced] #content>*{box-sizing:border-box;width:100%}html[data-fwe-mode=enhanced] .fwe-stream{grid-template-columns:repeat(var(--fwe-cols,2), minmax(0, 1fr));align-items:stretch;gap:1.25rem;width:100%;display:grid}html[data-fwe-mode=enhanced] .fwe-stream[data-cols=\"1\"]{grid-template-columns:minmax(0,1fr)}html[data-fwe-mode=enhanced] .fwe-stream[data-cols=\"2\"]{grid-template-columns:repeat(2,minmax(0,1fr))}html[data-fwe-mode=enhanced] .fwe-stream[data-cols=\"3\"]{grid-template-columns:repeat(3,minmax(0,1fr))}html[data-fwe-mode=enhanced] .fwe-stream[data-cols=\"4\"]{grid-template-columns:repeat(4,minmax(0,1fr))}html[data-fwe-mode=enhanced] .fwe-stream article.hentry{width:100%;flex-direction:column!important;height:100%!important;margin:0!important;display:flex!important}html[data-fwe-mode=enhanced] .fwe-stream article .entry-content,html[data-fwe-mode=enhanced] .fwe-stream article .entry-summary{flex-direction:column;flex:1;display:flex}html[data-fwe-mode=enhanced] .fwe-stream article .fwe-card-actions,html[data-fwe-mode=enhanced] .fwe-stream article .fwe-disclosures{margin-top:auto}html[data-fwe-mode=enhanced] #content>:not(article,.fwe-stream,.fwe-infinite-sentinel,.page-header,.navigation,.paging-navigation,.post-navigation,.tolstoycomments-feed,#comments,.comments-area){display:none!important}html[data-fwe-mode=enhanced] article.hentry{align-self:start;min-width:0;box-sizing:border-box!important;width:100%!important;max-width:none!important;margin:0!important}html[data-fwe-mode=enhanced] .fwe-game-card,html[data-fwe-mode=enhanced] .fwe-detail,html[data-fwe-mode=enhanced] .fwe-special,html[data-fwe-mode=enhanced] .fwe-result-card{border:1px solid var(--fwe-line);border-radius:var(--fwe-radius);background:var(--fwe-card);box-shadow:var(--fwe-shadow);height:fit-content;transition:transform .18s cubic-bezier(.16,1,.3,1),box-shadow .18s cubic-bezier(.16,1,.3,1);position:relative;overflow:visible;container-type:inline-size}html[data-fwe-mode=enhanced] .fwe-stream .fwe-game-card:hover{transform:translateY(-2px);box-shadow:0 10px 24px -6px #0000001f,0 0 0 1px #ff168d33}html[data-fwe-mode=enhanced] .fwe-game-card{content-visibility:auto;contain-intrinsic-size:auto 52rem}html[data-fwe-mode=enhanced] article .entry-header{box-sizing:border-box;border-bottom:1px solid var(--fwe-line);align-items:center;gap:.65rem;width:100%;max-width:none;margin:0;padding:1.1rem 1.25rem .85rem;display:flex}html[data-fwe-mode=enhanced] article .entry-title{min-width:0;color:var(--fwe-ink);text-transform:none;-webkit-line-clamp:2;text-overflow:ellipsis;-webkit-box-orient:vertical;flex:1;margin:0;font-family:Georgia,Times New Roman,serif;font-size:clamp(1.15rem,2.8cqw,1.55rem);font-weight:700;line-height:1.22;display:-webkit-box;overflow:hidden}html[data-fwe-mode=enhanced] .fwe-detail .entry-title{-webkit-line-clamp:unset;overflow:visible}html[data-fwe-mode=enhanced] article .entry-title a{color:inherit;text-decoration:none}html[data-fwe-mode=enhanced] article .entry-title a:hover{color:var(--fwe-pink)}html[data-fwe-mode=enhanced] .entry-meta,html[data-fwe-mode=enhanced] .entry-header>.entry-date,html[data-fwe-mode=enhanced] .entry-header>time{display:none}html[data-fwe-mode=enhanced] .fwe-article-meta{color:var(--fwe-muted);align-items:center;gap:.35rem;margin-top:.5rem;font-size:.72rem;display:flex}html[data-fwe-mode=enhanced] article .entry-content,html[data-fwe-mode=enhanced] article .entry-summary{box-sizing:border-box;width:100%;max-width:none;color:var(--fwe-ink);margin:0;padding:1.15rem 1.25rem 1.25rem}html[data-fwe-mode=enhanced] .fwe-game-layout{grid-template-columns:minmax(0,.82fr) minmax(0,1.18fr);align-items:start;gap:1.1rem;display:grid}html[data-fwe-mode=enhanced] .fwe-game-card .fwe-game-layout{display:block}html[data-fwe-mode=enhanced] .fwe-summary-panel{min-width:0}html[data-fwe-mode=enhanced] .fwe-game-card:not(.fwe-search-card) .fwe-summary-panel{grid-template-columns:minmax(7rem,9.5rem) minmax(0,1fr);align-items:start;gap:1rem;display:grid}html[data-fwe-mode=enhanced] .fwe-cover{object-fit:contain;object-position:center top;background:radial-gradient(circle,#00000005,#0000000f);border-radius:6px;width:100%;max-width:100%;height:auto;max-height:13rem;display:block;box-shadow:inset 0 0 0 1px #0000000f}html[data-fwe-mode=enhanced] .fwe-game-card .fwe-cover{min-height:9rem;max-height:13.5rem}html[data-fwe-mode=enhanced] .fwe-cover--placeholder{color:#938e88;text-transform:uppercase;background:#e6e2dc;place-items:center;min-height:9rem;font-size:.75rem;display:grid}html[data-fwe-mode=enhanced] .fwe-facts{flex-direction:column;gap:.38rem;margin:0;display:flex}html[data-fwe-mode=enhanced] .fwe-game-card .fwe-facts{margin-top:0}html[data-fwe-mode=enhanced] .fwe-fact{border-bottom:1px dashed #00000014;grid-template-columns:minmax(5.8rem,auto) minmax(0,1fr);gap:.5rem;padding:.28rem 0;font-size:.72rem;line-height:1.35;display:grid}html[data-fwe-mode=enhanced] .fwe-fact:last-child{border-bottom:0}html[data-fwe-mode=enhanced] .fwe-fact__label{color:var(--fwe-muted);align-items:center;gap:.4rem;margin:0;font-weight:650;display:flex}html[data-fwe-mode=enhanced] .fwe-fact__label .fwe-icon{width:.9rem;height:.9rem;color:var(--fwe-pink)}html[data-fwe-mode=enhanced] .fwe-fact__value{min-width:0;color:var(--fwe-ink);overflow-wrap:anywhere;margin:0;font-weight:700}html[data-fwe-mode=enhanced] .fwe-fact a,html[data-fwe-mode=enhanced] .fwe-disclosure__content a{color:var(--fwe-green)}html[data-fwe-mode=enhanced] .fwe-media{border:1px solid var(--fwe-line);background:#faf8f4;border-radius:3px;margin-top:.95rem}html[data-fwe-mode=enhanced] .fwe-media__summary{box-sizing:border-box;min-height:2.9rem;color:var(--fwe-ink);cursor:pointer;align-items:center;gap:.55rem;padding:.65rem .75rem;font-size:.76rem;font-weight:780;list-style:none;display:flex}html[data-fwe-mode=enhanced] .fwe-media__summary::-webkit-details-marker{display:none}html[data-fwe-mode=enhanced] .fwe-media__summary>.fwe-icon:first-child{color:var(--fwe-pink)}html[data-fwe-mode=enhanced] .fwe-media__label{flex:1}html[data-fwe-mode=enhanced] .fwe-media__count{color:var(--fwe-muted);font-size:.7rem}html[data-fwe-mode=enhanced] .fwe-media__chevron,html[data-fwe-mode=enhanced] .fwe-disclosure__chevron,html[data-fwe-mode=enhanced] .fwe-inline-disclosure__summary .fwe-icon{transition:transform .15s}html[data-fwe-mode=enhanced] .fwe-media[open] .fwe-media__chevron,html[data-fwe-mode=enhanced] .fwe-disclosure[open] .fwe-disclosure__chevron,html[data-fwe-mode=enhanced] .fwe-inline-disclosure[open] .fwe-icon{transform:rotate(180deg)}html[data-fwe-mode=enhanced] .fwe-game-card .fwe-media__gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem;padding:0 .75rem .75rem;display:grid}html[data-fwe-mode=enhanced] .fwe-detail .fwe-media__gallery{grid-template-columns:repeat(2,minmax(0,1fr));gap:.6rem;padding:0 .75rem .75rem;display:grid}html[data-fwe-mode=enhanced] .fwe-media__source{display:none!important}html[data-fwe-mode=enhanced] .fwe-media__item{aspect-ratio:16/9;cursor:zoom-in;background:#dedad4;border-radius:4px;min-width:0;transition:transform .16s,box-shadow .16s;display:block;position:relative;overflow:hidden}html[data-fwe-mode=enhanced] .fwe-media__item:hover{transform:translateY(-2px);box-shadow:0 6px 16px #00000038}html[data-fwe-mode=enhanced] .entry-content .fwe-media__item img,html[data-fwe-mode=enhanced] .entry-summary .fwe-media__item img,html[data-fwe-mode=enhanced] .entry-content .fwe-media__item video,html[data-fwe-mode=enhanced] .entry-summary .fwe-media__item video{object-position:center;min-width:100%;min-height:100%;display:block;float:none!important;object-fit:cover!important;width:100%!important;max-width:none!important;height:100%!important;margin:0!important}html[data-fwe-mode=enhanced] .fwe-card-actions{border-top:1px solid var(--fwe-line);background:#faf8f5d9;align-items:center;gap:.45rem;margin-top:auto;padding:.75rem .85rem;display:flex}html[data-fwe-mode=enhanced] .fwe-card-btn{border:1px solid var(--fwe-line);background:var(--fwe-card);height:2.15rem;color:var(--fwe-ink);cursor:pointer;white-space:nowrap;-webkit-user-select:none;user-select:none;border-radius:4px;flex:1;justify-content:center;align-items:center;gap:.35rem;padding:0 .5rem;font-size:.72rem;font-weight:750;transition:all .15s cubic-bezier(.16,1,.3,1);display:inline-flex}html[data-fwe-mode=enhanced] .fwe-card-btn:hover{border-color:var(--fwe-pink);color:var(--fwe-pink);background:#fff5fa;transform:translateY(-1px)}html[data-fwe-mode=enhanced] .fwe-card-btn--primary{border-color:var(--fwe-pink);background:var(--fwe-pink);color:#fff}html[data-fwe-mode=enhanced] .fwe-card-btn--primary:hover{color:#fff;background:#e00e79;border-color:#e00e79;box-shadow:0 4px 12px #ff168d40}html[data-fwe-mode=enhanced] .fwe-game-dialog{box-sizing:border-box;-webkit-backdrop-filter:blur(20px)saturate(180%);width:min(54rem,100vw - 2rem);max-height:85vh;color:var(--fwe-ink);background:#fffffff5;border:1px solid #ffffff4d;border-radius:12px;margin:auto;padding:0;overflow:hidden;box-shadow:0 25px 50px -12px #0000004d,0 0 0 1px #00000014}html[data-fwe-mode=enhanced] .fwe-game-dialog::backdrop{-webkit-backdrop-filter:blur(8px);background:#0f0c10a6}html[data-fwe-mode=enhanced] .fwe-game-dialog__panel{flex-direction:column;max-height:85vh;display:flex}html[data-fwe-mode=enhanced] .fwe-game-dialog__header{border-bottom:1px solid var(--fwe-line);background:#faf8f5;flex-direction:column;padding:1.1rem 1.25rem 0;display:flex}html[data-fwe-mode=enhanced] .fwe-game-dialog__title-row{justify-content:space-between;align-items:center;gap:1rem;margin-bottom:.85rem;display:flex}html[data-fwe-mode=enhanced] .fwe-game-dialog__title{color:var(--fwe-ink);text-overflow:ellipsis;white-space:nowrap;margin:0;font-size:1.05rem;font-weight:850;overflow:hidden}html[data-fwe-mode=enhanced] .fwe-game-dialog__title a{color:inherit;text-decoration:none}html[data-fwe-mode=enhanced] .fwe-game-dialog__title a:hover{color:var(--fwe-pink)}html[data-fwe-mode=enhanced] .fwe-game-dialog__tabs{gap:.5rem;display:flex;overflow-x:auto}html[data-fwe-mode=enhanced] .fwe-game-dialog__tab{color:var(--fwe-muted);cursor:pointer;white-space:nowrap;background:0 0;border:0;border-bottom:2px solid #0000;align-items:center;gap:.45rem;padding:.65rem .95rem;font-size:.82rem;font-weight:780;transition:all .15s;display:inline-flex}html[data-fwe-mode=enhanced] .fwe-game-dialog__tab:hover{color:var(--fwe-ink)}html[data-fwe-mode=enhanced] .fwe-game-dialog__tab--active{color:var(--fwe-pink);border-bottom-color:var(--fwe-pink)}html[data-fwe-mode=enhanced] .fwe-card-payload,html[data-fwe-mode=enhanced] .fwe-game-dialog__pane{display:none!important}html[data-fwe-mode=enhanced] .fwe-game-dialog__pane.fwe-game-dialog__pane--active{display:block!important}html[data-fwe-mode=enhanced] .fwe-game-dialog__pane[hidden]{display:none!important}html[data-fwe-mode=enhanced] .fwe-game-dialog__body{overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#0003 transparent;flex:1;padding:1.25rem 1.5rem;font-size:.85rem;line-height:1.6;overflow-y:auto}html[data-fwe-mode=enhanced] .fwe-game-dialog__body::-webkit-scrollbar{width:6px}html[data-fwe-mode=enhanced] .fwe-game-dialog__body::-webkit-scrollbar-thumb{background:#0003;border-radius:999px}html[data-fwe-mode=enhanced] .fwe-direct-links-details{border:1px solid var(--fwe-line);background:#fdfbf7;border-radius:6px;margin:.75rem 0;overflow:hidden}html[data-fwe-mode=enhanced] .fwe-direct-links-summary{box-sizing:border-box;color:var(--fwe-ink);cursor:pointer;-webkit-user-select:none;user-select:none;background:#f5f2eb;align-items:center;gap:.5rem;padding:.55rem .85rem;font-size:.78rem;font-weight:780;list-style:none;transition:background-color .15s;display:flex}html[data-fwe-mode=enhanced] .fwe-direct-links-summary::-webkit-details-marker{display:none}html[data-fwe-mode=enhanced] .fwe-direct-links-summary:hover{color:var(--fwe-pink);background:#eeeae0}html[data-fwe-mode=enhanced] .fwe-direct-links-chevron{width:.95rem;height:.95rem;color:var(--fwe-pink);transition:transform .18s}html[data-fwe-mode=enhanced] .fwe-direct-links-details[open] .fwe-direct-links-chevron{transform:rotate(180deg)}html[data-fwe-mode=enhanced] .fwe-direct-links-content{border-top:1px solid var(--fwe-line);background:#fff;padding:.85rem 1rem;font-size:.82rem;line-height:1.6}html[data-fwe-mode=enhanced] .fwe-detail-sections{flex-direction:column;gap:1.25rem;margin-top:1.5rem;display:flex}html[data-fwe-mode=enhanced] .fwe-detail-section{border:1px solid var(--fwe-line);background:var(--fwe-card);box-shadow:var(--fwe-shadow);border-radius:8px;overflow:hidden}html[data-fwe-mode=enhanced] .fwe-detail-section__header{border-bottom:1px solid var(--fwe-line);color:var(--fwe-ink);background:#faf8f4;align-items:center;gap:.6rem;padding:.75rem 1.1rem;display:flex}html[data-fwe-mode=enhanced] .fwe-detail-section__header .fwe-icon{color:var(--fwe-pink)}html[data-fwe-mode=enhanced] .fwe-detail-section__title{margin:0;font-size:.88rem;font-weight:850}html[data-fwe-mode=enhanced] .fwe-detail-section__content{padding:1rem 1.25rem;font-size:.85rem;line-height:1.6}html[data-fwe-mode=enhanced] .fwe-description-shell{display:none!important}html[data-fwe-mode=enhanced] .fwe-upcoming{border:1px solid var(--fwe-line);color:var(--fwe-ink);background:var(--fwe-card);grid-column:1/-1}html[data-fwe-mode=enhanced] .fwe-upcoming>.entry-header{display:none}html[data-fwe-mode=enhanced] .fwe-upcoming .entry-content{padding:0}html[data-fwe-mode=enhanced] .fwe-upcoming__summary{cursor:pointer;align-items:center;gap:.6rem;min-height:2.9rem;padding:.5rem 1rem;list-style:none;display:flex}html[data-fwe-mode=enhanced] .fwe-upcoming__summary::-webkit-details-marker{display:none}html[data-fwe-mode=enhanced] .fwe-upcoming__eyebrow{color:#ff168d;letter-spacing:.12em;text-transform:uppercase;font-size:.72rem;font-weight:850}html[data-fwe-mode=enhanced] .fwe-upcoming__body{color:var(--fwe-ink);align-items:center;gap:.45rem;padding:0 1rem .7rem;font-size:.72rem;line-height:1.5;display:flex;overflow:auto hidden}html[data-fwe-mode=enhanced] .fwe-upcoming__body a{color:#307d25;white-space:nowrap;font-weight:650;text-decoration:none}html[data-fwe-mode=enhanced] .fwe-upcoming__separator{color:#58a84e}html[data-fwe-mode=enhanced] .fwe-upcoming__source{display:none}html[data-fwe-mode=enhanced] .fwe-stream article.hentry:first-of-type,html[data-fwe-mode=enhanced] article.hentry[data-fwe-rank=latest]{box-shadow:0 4px 20px -2px #ff168d26, var(--fwe-shadow);border-color:#ff168d66!important}html[data-fwe-mode=enhanced] .fwe-order-badge{height:1.35rem;color:var(--fwe-muted);letter-spacing:-.01em;background:#0000000d;border-radius:4px;flex-shrink:0;justify-content:center;align-items:center;padding:0 .5rem;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:.68rem;font-weight:700;transition:all .15s;display:inline-flex}html[data-fwe-mode=enhanced] article.hentry[data-fwe-rank=\"1\"] .fwe-order-badge,html[data-fwe-mode=enhanced] .fwe-order-badge[data-rank=\"1\"]{background:var(--fwe-pink);color:#fff;box-shadow:0 2px 8px #ff168d66}html[data-fwe-mode=enhanced] article.hentry[data-fwe-rank=\"2\"] .fwe-order-badge,html[data-fwe-mode=enhanced] .fwe-order-badge[data-rank=\"2\"]{color:var(--fwe-pink);background:#ff168d29;font-weight:800}html[data-fwe-mode=enhanced] article.hentry[data-fwe-rank=\"3\"] .fwe-order-badge,html[data-fwe-mode=enhanced] .fwe-order-badge[data-rank=\"3\"]{color:var(--fwe-pink);background:#ff168d1a}html[data-fwe-mode=enhanced] .fwe-header-right{flex-shrink:0;align-items:center;gap:.45rem;margin-left:auto;display:flex}html[data-fwe-mode=enhanced] .fwe-time-ago{color:var(--fwe-muted);white-space:nowrap;background:#0000000a;border-radius:999px;align-items:center;padding:.18rem .45rem;font-size:.68rem;font-weight:500;display:inline-flex}html[data-fwe-mode=enhanced] article.hentry[data-fwe-rank=\"1\"] .fwe-time-ago{color:var(--fwe-pink);background:#ff168d1a;font-weight:600}html[data-fwe-mode=enhanced] .fwe-infinite-sentinel{justify-content:center;align-items:center;width:100%;min-height:4rem;padding:1.5rem 0;display:flex}html[data-fwe-mode=enhanced] .fwe-infinite-loader{background:var(--fwe-card);border:1px solid var(--fwe-line);color:var(--fwe-muted);box-shadow:var(--fwe-shadow);border-radius:999px;align-items:center;gap:.65rem;padding:.6rem 1.25rem;font-size:.8rem;font-weight:500;display:inline-flex}html[data-fwe-mode=enhanced] .fwe-infinite-loader__spinner{border:2px solid #ff168d33;border-top-color:var(--fwe-pink);border-radius:50%;width:1rem;height:1rem;animation:.8s linear infinite fwe-spin}@keyframes fwe-spin{to{transform:rotate(360deg)}}html[data-fwe-mode=enhanced] .fwe-infinite-end{color:var(--fwe-muted);background:#0000000a;border-radius:999px;align-items:center;padding:.5rem 1rem;font-size:.75rem;display:inline-flex}html[data-fwe-mode=enhanced] .fwe-special,html[data-fwe-mode=enhanced] .fwe-detail,html[data-fwe-mode=enhanced] #content>.page-header,html[data-fwe-mode=enhanced] #content>.navigation,html[data-fwe-mode=enhanced] #content>.paging-navigation,html[data-fwe-mode=enhanced] #content>.post-navigation,html[data-fwe-mode=enhanced] .fwe-directory-popular,html[data-fwe-mode=enhanced] .fwe-directory-az,html[data-fwe-mode=enhanced] .fwe-directory-updates,html[data-fwe-mode=enhanced] .tolstoycomments-feed,html[data-fwe-mode=enhanced] #comments,html[data-fwe-mode=enhanced] .comments-area{grid-column:1/-1}html[data-fwe-mode=enhanced] body:not(.single,.single-post,.page,.singular) article.hentry:not(.fwe-upcoming,.fwe-directory-popular,.fwe-directory-az,.fwe-directory-updates),html[data-fwe-mode=enhanced] body.search-results .fwe-result-card,html[data-fwe-mode=enhanced] body:not(.single,.single-post,.page,.singular) .fwe-digest{grid-column:auto}html[data-fwe-mode=enhanced] #content>.page-header{margin:0;padding:.25rem 0}html[data-fwe-mode=enhanced] #content>.page-header .page-title{color:var(--fwe-ink);text-transform:none;margin:0;font-family:Georgia,Times New Roman,serif;font-size:clamp(1.4rem,2.8vw,2.2rem)}html[data-fwe-mode=enhanced] .fwe-digest .entry-content>div:first-child{display:flow-root;margin:0!important}html[data-fwe-mode=enhanced] .fwe-digest .entry-content>div:first-child>img,html[data-fwe-mode=enhanced] .fwe-digest .entry-content>div:first-child>a>img{width:min(7rem,28vw)!important;height:auto!important;margin:0 1rem .75rem 0!important}html[data-fwe-mode=enhanced] .fwe-inline-disclosure{clear:both;margin:.55rem 0}html[data-fwe-mode=enhanced] .fwe-directory-heading{color:var(--fwe-ink);margin:0 0 1rem;font-family:Georgia,Times New Roman,serif;font-size:clamp(1.15rem,2vw,1.55rem)}html[data-fwe-mode=enhanced] .fwe-directory-grid{grid-template-columns:repeat(auto-fill,minmax(9rem,1fr));gap:1rem;display:grid}html[data-fwe-mode=enhanced] .fwe-directory-tile{min-width:0;color:var(--fwe-ink);flex-direction:column;gap:.55rem;font-size:.78rem;font-weight:750;line-height:1.35;text-decoration:none;display:flex}html[data-fwe-mode=enhanced] .fwe-directory-tile img{aspect-ratio:3/4;object-fit:cover;display:block;width:100%!important;max-width:none!important;height:auto!important;margin:0!important}html[data-fwe-mode=enhanced] .fwe-directory-tile__title{-webkit-line-clamp:3;-webkit-box-orient:vertical;display:-webkit-box;overflow:hidden}html[data-fwe-mode=enhanced] .fwe-directory-az .lcp_catlist{grid-template-columns:repeat(auto-fill,minmax(min(18rem,100%),1fr));gap:.5rem;margin:0;padding:0;list-style:none;display:grid}html[data-fwe-mode=enhanced] .fwe-directory-az .lcp_catlist a{box-sizing:border-box;border:1px solid var(--fwe-line);min-height:2.75rem;color:var(--fwe-ink);background:#faf8f4;border-radius:3px;align-items:center;padding:.65rem .8rem;font-size:.78rem;font-weight:680;line-height:1.35;text-decoration:none;display:flex}html[data-fwe-mode=enhanced] .fwe-detail{grid-column:1/-1}html[data-fwe-mode=enhanced] .fwe-detail .fwe-game-layout{grid-template-columns:minmax(17rem,4fr) minmax(0,8fr);gap:clamp(1.5rem,3vw,3rem)}html[data-fwe-mode=enhanced] .fwe-detail .fwe-cover{object-fit:contain;object-position:left top;background:0 0;max-height:34rem}html[data-fwe-mode=enhanced] .fwe-search-card .fwe-game-layout{display:block}html[data-fwe-mode=enhanced] .fwe-search-card .fwe-summary-panel{grid-template-columns:minmax(0,1fr);display:grid}html[data-fwe-mode=enhanced] .fwe-search-card .fwe-summary-panel:has(.fwe-cover){grid-template-columns:minmax(8rem,.22fr) minmax(0,.78fr);gap:1rem}html[data-fwe-mode=enhanced] .fwe-search-card .fwe-search-meta,html[data-fwe-mode=enhanced] .fwe-search-card .fwe-facts{grid-column:1/-1}:is(html[data-fwe-mode=enhanced] .fwe-search-card .fwe-summary-panel:has(.fwe-cover) .fwe-search-meta,html[data-fwe-mode=enhanced] .fwe-search-card .fwe-summary-panel:has(.fwe-cover) .fwe-facts){grid-column:2}html[data-fwe-mode=enhanced] .fwe-search-card .fwe-search-meta{flex-wrap:wrap;gap:.4rem;margin-bottom:.15rem;display:flex}html[data-fwe-mode=enhanced] .fwe-search-meta__item{border:1px solid var(--fwe-line);color:var(--fwe-muted);border-radius:999px;padding:.2rem .42rem;font-size:.67rem;font-weight:800}html[data-fwe-mode=enhanced] .fwe-search-card .fwe-facts{grid-template-columns:repeat(2,minmax(0,1fr));gap:0 1rem;margin-top:0}html[data-fwe-mode=enhanced] .fwe-search-card .fwe-search-excerpt,html[data-fwe-mode=enhanced] .fwe-search-fallback p{color:var(--fwe-muted);margin:0;font-size:.8rem;line-height:1.55}html[data-fwe-mode=enhanced] .fwe-search-fallback{padding:1.15rem 1.25rem 1.25rem}html[data-fwe-mode=enhanced] .fwe-search-fallback__link{min-height:2.75rem;color:var(--fwe-green);align-items:center;margin-top:.85rem;font-size:.78rem;font-weight:750;display:inline-flex}@container (width<=26rem){html[data-fwe-mode=enhanced] .fwe-game-card:not(.fwe-search-card) .fwe-summary-panel{flex-direction:column;align-items:center;gap:.75rem;display:flex}html[data-fwe-mode=enhanced] .fwe-cover{max-height:14rem}html[data-fwe-mode=enhanced] .fwe-facts{width:100%}}@container (width<=34rem){html[data-fwe-mode=enhanced] .fwe-game-layout,html[data-fwe-mode=enhanced] .fwe-detail .fwe-game-layout{grid-template-columns:minmax(0,1fr)}html[data-fwe-mode=enhanced] .fwe-card-actions{flex-wrap:wrap}}@media (width<=78rem){html[data-fwe-mode=enhanced] #site-header-menu,html[data-fwe-mode=enhanced] #masthead .primary-navigation{display:none}}@media (width<=64rem){html[data-fwe-mode=enhanced] .fwe-detail .fwe-game-layout{grid-template-columns:minmax(0,1fr)}html[data-fwe-mode=enhanced] .fwe-detail .fwe-summary-panel{grid-template-columns:minmax(12rem,.8fr) minmax(0,1.2fr);gap:1.25rem;display:grid}}@media (width<=47.99rem){.fwe-popular-dialog,.fwe-browse-dialog{border-radius:14px 14px 0 0;width:100vw;height:min(78dvh,42rem);margin:auto 0 0;box-shadow:0 -18px 48px #00000040}.fwe-popular-dialog[open],.fwe-browse-dialog[open]{animation-name:fwe-sheet-in}@keyframes fwe-sheet-in{0%{transform:translateY(100%)}}html[data-fwe-mode=enhanced] #masthead,html[data-fwe-mode=enhanced] #masthead .header-main,html[data-fwe-mode=enhanced] #masthead .site-header-main{min-height:3.7rem}html[data-fwe-mode=enhanced] #masthead .header-main,html[data-fwe-mode=enhanced] #masthead .site-header-main{flex-wrap:wrap;gap:.45rem;padding-block:.45rem}html[data-fwe-mode=enhanced] .fwe-search{order:5;width:100%}html[data-fwe-mode=enhanced] .fwe-popular-button,html[data-fwe-mode=enhanced] .fwe-browse-button,html[data-fwe-mode=enhanced] .fwe-view-control__trigger{width:2.75rem;padding:0;font-size:0}html[data-fwe-mode=enhanced] .fwe-view-control{margin-left:auto}html[data-fwe-mode=enhanced] #content{gap:.85rem;width:calc(100% - 1.25rem)}html[data-fwe-mode=enhanced] #main{padding-top:.55rem}html[data-fwe-mode=enhanced] article .entry-header{padding:1rem .9rem .75rem}html[data-fwe-mode=enhanced] article .entry-content,html[data-fwe-mode=enhanced] .fwe-search-fallback{padding:.85rem .9rem 1rem}html[data-fwe-mode=enhanced] article .entry-title{font-size:1.15rem}html[data-fwe-mode=enhanced] .fwe-game-layout,html[data-fwe-mode=enhanced] .fwe-detail .fwe-game-layout{display:block}html[data-fwe-mode=enhanced] .fwe-game-card:not(.fwe-search-card) .fwe-summary-panel,html[data-fwe-mode=enhanced] .fwe-detail .fwe-summary-panel{grid-template-columns:minmax(6.5rem,8.5rem) minmax(0,1fr);gap:.75rem;display:grid}html[data-fwe-mode=enhanced] .fwe-cover,html[data-fwe-mode=enhanced] .fwe-detail .fwe-cover{aspect-ratio:auto;object-fit:contain;object-position:center top;height:auto;max-height:11.5rem}html[data-fwe-mode=enhanced] .fwe-facts{margin:0}html[data-fwe-mode=enhanced] .fwe-fact{padding:.38rem 0;font-size:.65rem;display:block}html[data-fwe-mode=enhanced] .fwe-fact__label{margin-bottom:.12rem}html[data-fwe-mode=enhanced] .fwe-media__gallery,html[data-fwe-mode=enhanced] .fwe-detail .fwe-media__gallery,html[data-fwe-mode=enhanced] .fwe-game-card .fwe-media__gallery{grid-template-columns:minmax(0,1fr)}html[data-fwe-mode=enhanced] .fwe-card-actions{flex-wrap:wrap;gap:.35rem}html[data-fwe-mode=enhanced] .fwe-card-btn{height:2rem;font-size:.68rem}html[data-fwe-mode=enhanced] .fwe-upcoming__body{flex-direction:column;align-items:flex-start;gap:.3rem;max-height:14rem;overflow:hidden auto}html[data-fwe-mode=enhanced] .fwe-upcoming__separator{display:none}:is(html[data-fwe-mode=enhanced] .fwe-search-card .fwe-summary-panel,html[data-fwe-mode=enhanced] .fwe-search-card .fwe-summary-panel:has(.fwe-cover)){display:block}html[data-fwe-mode=enhanced] .fwe-search-card .fwe-search-meta,html[data-fwe-mode=enhanced] .fwe-search-card .fwe-facts{grid-column:auto}html[data-fwe-mode=enhanced] .fwe-search-card .fwe-summary-panel:has(.fwe-cover) .fwe-search-meta{grid-column:auto}html[data-fwe-mode=enhanced] .fwe-search-card .fwe-summary-panel:has(.fwe-cover) .fwe-facts{grid-column:auto}html[data-fwe-mode=enhanced] .fwe-search-card .fwe-facts{grid-template-columns:1fr}}@media (prefers-reduced-motion:reduce){.fwe-popular-dialog[open],.fwe-browse-dialog[open],.fwe-switch__thumb,html[data-fwe-mode=enhanced] .fwe-media__chevron,html[data-fwe-mode=enhanced] .fwe-disclosure__chevron,html[data-fwe-mode=enhanced] .fwe-inline-disclosure__summary .fwe-icon{transition:none;animation:none}}");
	var STORAGE_KEY = "fitgirl-web-enhanced:v1:layout-mode";
	var SECTION_LABELS = [
		["downloads", /^download\s+mirrors?/i],
		["screenshots", /^screenshots?/i],
		["features", /^repack\s+features?/i]
	];
	function normalizeText(value) {
		return (value ?? "").replace(/\s+/g, " ").trim();
	}
	function detectPageKind(body = document.body) {
		return body.classList.contains("single-post") ? "single" : "listing";
	}
	function classifySectionHeading(element) {
		if (!/^H[2-4]$/.test(element.tagName)) return null;
		const text = normalizeText(element.textContent);
		return SECTION_LABELS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
	}
	function textWithBreaks(element) {
		const clone = element.cloneNode(true);
		if (!(clone instanceof Element)) return [];
		clone.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
		return (clone.textContent ?? "").split("\n").map((line) => normalizeText(line)).filter(Boolean);
	}
	function findValue(lines, labels) {
		for (const line of lines) for (const label of labels) {
			const match = line.match(new RegExp(`^${label}\\s*:\\s*(.+)$`, "i"));
			if (match?.[1]) return normalizeText(match[1]);
		}
		return "";
	}
	function findInlineValue(text, labels) {
		const labelPattern = labels.join("|");
		return normalizeText(text.match(new RegExp(`(?:${labelPattern})\\s*:\\s*(.+?)(?=\\s+(?:Genres/Tags|Compan(?:y|ies)|Languages?|Original Size|Repack Size|Download Mirrors|Filehosters?|Continue reading)\\s*:?|$)`, "i"))?.[1]);
	}
	function extractFacts(infoBlock) {
		if (!infoBlock) return [];
		const lines = textWithBreaks(infoBlock);
		const inlineText = normalizeText(infoBlock.textContent);
		const tagLinks = [...infoBlock.querySelectorAll("a[href*=\"/tag/\"]")].map((link) => ({
			text: normalizeText(link.textContent),
			href: link.href
		}));
		return [
			{
				label: "Genres/Tags",
				value: findValue(lines, ["Genres/Tags"]) || findInlineValue(inlineText, ["Genres/Tags"]) || tagLinks.map((link) => link.text).join(", "),
				links: tagLinks
			},
			{
				label: "Company",
				value: findValue(lines, ["Compan(?:y|ies)"]) || findInlineValue(inlineText, ["Compan(?:y|ies)"]),
				links: []
			},
			{
				label: "Languages",
				value: findValue(lines, ["Languages?"]) || findInlineValue(inlineText, ["Languages?"]),
				links: []
			},
			{
				label: "Original Size",
				value: findValue(lines, ["Original Size"]) || findInlineValue(inlineText, ["Original Size"]),
				links: []
			},
			{
				label: "Repack Size",
				value: findValue(lines, ["Repack Size"]) || findInlineValue(inlineText, ["Repack Size"]),
				links: []
			}
		].filter((fact) => fact.value || fact.links.length > 0);
	}
	function findInfoBlock(entry) {
		return [...entry.children].find((child) => child instanceof HTMLElement && /(?:Genres\/Tags|Original Size|Repack Size)/i.test(child.textContent ?? "")) ?? null;
	}
	function collectSections(entry) {
		const sections = new Map();
		const children = [...entry.children].filter((child) => child instanceof HTMLElement);
		for (let index = 0; index < children.length; index += 1) {
			const child = children[index];
			if (!child) continue;
			const kind = classifySectionHeading(child);
			if (!kind) continue;
			let end = index + 1;
			while (end < children.length) {
				const candidate = children[end];
				if (!candidate || classifySectionHeading(candidate)) break;
				if (candidate.matches(".su-spoiler")) {
					const titleText = normalizeText(candidate.querySelector(".su-spoiler-title")?.textContent);
					if (/game\s+description/i.test(titleText)) break;
				}
				end += 1;
			}
			const range = children.slice(index, end);
			const existing = sections.get(kind);
			if (existing && kind === "downloads") existing.nodes.push(...range);
			else sections.set(kind, {
				kind,
				heading: child,
				nodes: range
			});
			index = end - 1;
		}
		for (const child of children) if (child.matches(".su-spoiler")) {
			const titleText = normalizeText(child.querySelector(".su-spoiler-title")?.textContent);
			if (/game\s+description/i.test(titleText)) {
				sections.set("description", {
					kind: "description",
					heading: null,
					nodes: [child]
				});
				break;
			}
		}
		if (!sections.has("description")) {
			const downloadsNodes = sections.get("downloads")?.nodes ?? [];
			const candidate = [...entry.querySelectorAll(".su-spoiler")].reverse().find((s) => !downloadsNodes.includes(s));
			if (candidate) sections.set("description", {
				kind: "description",
				heading: null,
				nodes: [candidate]
			});
		}
		return sections;
	}
	function collectMedia(section) {
		if (!section) return [];
		return section.nodes.flatMap((node) => [...node.matches("a") ? [node] : [], ...node.querySelectorAll("a")]).filter((anchor, index, all) => all.indexOf(anchor) === index).map((element) => ({
			element,
			image: element.querySelector("img"),
			video: element.querySelector("video")
		})).filter((item) => item.image || item.video);
	}
	function detectArticleKind(title, infoBlock) {
		if (/^upcoming repacks$/i.test(title)) return "upcoming";
		return infoBlock ? "game" : "special";
	}
	function parseArticle(root, pageKind) {
		const header = root.querySelector(":scope > .entry-header");
		const entry = root.querySelector(":scope > .entry-content, :scope > .entry-summary");
		const titleElement = header?.querySelector(".entry-title") ?? null;
		const titleLink = titleElement?.querySelector("a") ?? null;
		const title = normalizeText(titleElement?.textContent);
		if (!entry) return {
			root,
			kind: "special",
			pageKind,
			header,
			entry: null,
			title,
			titleLink,
			repackHeading: null,
			infoBlock: null,
			cover: null,
			sections: new Map(),
			media: []
		};
		const infoBlock = findInfoBlock(entry);
		const sections = collectSections(entry);
		const repackHeading = [...entry.children].find((child) => child instanceof HTMLElement && /^H[2-4]$/.test(child.tagName) && !classifySectionHeading(child)) ?? null;
		const cover = infoBlock?.querySelector("img") ?? null;
		return {
			root,
			kind: detectArticleKind(title, infoBlock),
			pageKind,
			header,
			entry,
			title,
			titleLink,
			repackHeading,
			infoBlock,
			cover,
			sections,
			media: collectMedia(sections.get("screenshots"))
		};
	}
	function parsePopularItems(root) {
		if (!root) return [];
		return [...root.querySelectorAll("a[href]")].filter((link) => Boolean(link.querySelector("img"))).map((link, index) => {
			const image = link.querySelector("img");
			return {
				rank: index + 1,
				title: normalizeText(link.getAttribute("title")) || normalizeText(image?.getAttribute("alt")) || `Popular repack ${index + 1}`,
				href: link.href,
				imageUrl: image?.currentSrc || image?.src || null
			};
		});
	}
	function cloneNavigationLink(link) {
		return {
			title: normalizeText(link.textContent),
			href: link.href,
			target: link.getAttribute("target"),
			rel: link.getAttribute("rel")
		};
	}
	function parseNavigationList(list) {
		return [...list.children].filter((node) => node instanceof HTMLElement && node.matches("li")).flatMap((item) => {
			const link = item.querySelector(":scope > a[href]");
			if (!link || !normalizeText(link.textContent)) return [];
			const childList = item.querySelector(":scope > ul");
			return [{
				...cloneNavigationLink(link),
				children: childList ? parseNavigationList(childList) : []
			}];
		});
	}
	function parseNavigation(root) {
		const list = root?.querySelector(":scope .nav-menu, :scope > ul");
		return list ? parseNavigationList(list) : [];
	}
	function parseArchiveGroups(root) {
		const groups = new Map();
		root?.querySelectorAll("a[href]").forEach((link) => {
			const label = normalizeText(link.textContent);
			const year = label.match(/\b(19|20)\d{2}\b/)?.[0] ?? link.href.match(/\/(19|20)\d{2}\//)?.[1];
			if (!label || !year) return;
			const count = normalizeText(link.parentElement?.textContent).match(/\((\d+)\)\s*$/)?.[1] ?? "";
			const group = groups.get(year) ?? {
				year,
				items: []
			};
			group.items.push({
				label,
				href: link.href,
				count
			});
			groups.set(year, group);
		});
		return [...groups.values()].sort((left, right) => Number(right.year) - Number(left.year));
	}
	function parseUpcomingItems(entry) {
		if (!entry) return [];
		const clone = entry.cloneNode(true);
		clone.querySelectorAll(".wplp_outside, style, script, noscript").forEach((el) => el.remove());
		const links = [...clone.querySelectorAll("a[href]")].filter((a) => {
			const text = a.textContent?.trim();
			const href = a.getAttribute("href") || "";
			return Boolean(text) && !href.includes("#respond") && !href.includes("/category/") && !href.includes("/author/");
		});
		if (links.length > 0) {
			const items = [];
			for (const a of links) {
				const text = (a.textContent ?? "").trim().replace(/^[⇢→•\-*·\s]+/, "").trim();
				const href = a.getAttribute("href");
				if (text && !items.some((item) => item.text === text)) items.push({
					text,
					href
				});
			}
			if (items.length > 0) return items;
		}
		const textContent = clone.innerHTML.replace(/<!--[\s\S]*?-->/g, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|h[1-6]|li)>/gi, "\n");
		const container = document.createElement("div");
		container.innerHTML = textContent;
		const lines = (container.textContent ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
		const items = [];
		for (const line of lines) {
			if (/DO NOT ASK FOR ANY PARTICULAR/i.test(line)) continue;
			if (/Latest Repacks/i.test(line)) continue;
			if (/^\.wplp/i.test(line)) continue;
			if (/^Upcoming Repacks$/i.test(line)) continue;
			if (/^-->$/i.test(line)) continue;
			if (/^Next:?$/i.test(line)) continue;
			const cleaned = line.replace(/^[⇢→•\-*·\s]+/, "").trim();
			if (cleaned.length > 1 && !items.some((item) => item.text === cleaned)) items.push({
				text: cleaned,
				href: null
			});
		}
		return items;
	}
	var DomTransaction = class {
		moved = [];
		attributes = [];
		generated = [];
		classes = [];
		cleanups = [];
		move(node, parent, before = null) {
			const originalParent = node.parentNode;
			if (!originalParent) return;
			this.moved.push({
				node,
				parent: originalParent,
				nextSibling: node.nextSibling
			});
			parent.insertBefore(node, before);
		}
		insert(node, parent, before = null) {
			parent.insertBefore(node, before);
			this.generated.push(node);
		}
		setAttribute(element, name, value) {
			this.attributes.push({
				element,
				name,
				existed: element.hasAttribute(name),
				value: element.getAttribute(name)
			});
			if (value === null) element.removeAttribute(name);
			else element.setAttribute(name, value);
		}
		addClass(element, className) {
			if (element.classList.contains(className)) return;
			this.classes.push({
				element,
				className,
				existed: element.hasAttribute("class"),
				value: element.getAttribute("class")
			});
			element.classList.add(className);
		}
		onRestore(cleanup) {
			this.cleanups.push(cleanup);
		}
		restore() {
			for (const cleanup of [...this.cleanups].reverse()) cleanup();
			for (const record of [...this.moved].reverse()) {
				const before = record.nextSibling?.parentNode === record.parent ? record.nextSibling : null;
				record.parent.insertBefore(record.node, before);
			}
			for (const record of [...this.attributes].reverse()) if (record.existed && record.value !== null) record.element.setAttribute(record.name, record.value);
			else record.element.removeAttribute(record.name);
			for (const record of [...this.classes].reverse()) if (record.existed && record.value !== null) record.element.setAttribute("class", record.value);
			else record.element.removeAttribute("class");
			for (const node of [...this.generated].reverse()) node.parentNode?.removeChild(node);
			this.moved.length = 0;
			this.attributes.length = 0;
			this.classes.length = 0;
			this.generated.length = 0;
			this.cleanups.length = 0;
		}
	};
	function parseDateString(str) {
		if (!str) return null;
		const trimmed = str.trim();
		if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
			const d = new Date(trimmed);
			if (!Number.isNaN(d.getTime())) return d;
		}
		const dmyMatch = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
		if (dmyMatch && dmyMatch[1] && dmyMatch[2] && dmyMatch[3]) {
			const day = Number.parseInt(dmyMatch[1], 10);
			const month = Number.parseInt(dmyMatch[2], 10) - 1;
			const year = Number.parseInt(dmyMatch[3], 10);
			const hour = dmyMatch[4] ? Number.parseInt(dmyMatch[4], 10) : 0;
			const minute = dmyMatch[5] ? Number.parseInt(dmyMatch[5], 10) : 0;
			const second = dmyMatch[6] ? Number.parseInt(dmyMatch[6], 10) : 0;
			const d = new Date(year, month, day, hour, minute, second);
			if (!Number.isNaN(d.getTime())) return d;
		}
		const fallback = new Date(trimmed);
		if (!Number.isNaN(fallback.getTime())) return fallback;
		return null;
	}
	function parseArticleDate(dateElement, headerElement) {
		if (!dateElement && !headerElement) return null;
		const timeNode = dateElement?.tagName === "TIME" ? dateElement : dateElement?.querySelector?.("time") ?? headerElement?.querySelector?.("time");
		const rawDateTime = timeNode?.getAttribute("datetime") || timeNode?.dateTime || dateElement?.getAttribute("datetime");
		if (rawDateTime) {
			const parsed = parseDateString(rawDateTime);
			if (parsed) return parsed;
		}
		const text = normalizeText(timeNode?.textContent || dateElement?.textContent);
		if (text) {
			const parsed = parseDateString(text);
			if (parsed) return parsed;
		}
		return null;
	}
	function formatRelativeTime(targetDate, now = new Date()) {
		const diffMs = now.getTime() - targetDate.getTime();
		if (diffMs <= 0) return "Today";
		const diffHours = diffMs / 36e5;
		const todayCalendar = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
		const targetCalendar = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
		const calendarDayDiff = Math.round((todayCalendar - targetCalendar) / 864e5);
		if (calendarDayDiff <= 0 || diffHours < 18) return "Today";
		if (calendarDayDiff === 1 || diffHours >= 18 && diffHours < 42) return "Yesterday";
		const days = Math.max(2, Math.floor(diffHours / 24));
		if (days < 7) return `${days}d ago`;
		if (days < 30) return `${Math.floor(days / 7)}w ago`;
		if (days < 365) return `${Math.floor(days / 30)}mo ago`;
		return `${Math.floor(days / 365)}y ago`;
	}
	var MEDIA_EXPAND_STORAGE_KEY = "fitgirl-web-enhanced:v1:media-expand";
	var INFINITE_SCROLL_STORAGE_KEY = "fitgirl-web-enhanced:v1:infinite-scroll";
	var TIMESTAMP_KEY = `${STORAGE_KEY}:updated-at`;
	var MEDIA_TIMESTAMP_KEY = `${MEDIA_EXPAND_STORAGE_KEY}:updated-at`;
	var INFINITE_SCROLL_TIMESTAMP_KEY = `${INFINITE_SCROLL_STORAGE_KEY}:updated-at`;
	var DATABASE_NAME = "fitgirl-web-enhanced";
	var STORE_NAME = "preferences";
	function asPreference(mode, updatedAt) {
		if (mode !== "enhanced" && mode !== "original") return null;
		const timestamp = Number(updatedAt);
		return {
			mode,
			updatedAt: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0
		};
	}
	function asMediaPreference(expanded, updatedAt) {
		if (expanded !== "true" && expanded !== "false") return null;
		const timestamp = Number(updatedAt);
		return {
			expanded: expanded === "true",
			updatedAt: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0
		};
	}
	function asInfiniteScrollPreference(enabled, updatedAt) {
		if (enabled !== "true" && enabled !== "false") return null;
		const timestamp = Number(updatedAt);
		return {
			enabled: enabled === "true",
			updatedAt: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0
		};
	}
	function readLocal() {
		try {
			return asPreference(window.localStorage.getItem(STORAGE_KEY), window.localStorage.getItem(TIMESTAMP_KEY));
		} catch {
			return null;
		}
	}
	function writeLocal(value) {
		try {
			window.localStorage.setItem(STORAGE_KEY, value.mode);
			window.localStorage.setItem(TIMESTAMP_KEY, String(value.updatedAt));
		} catch {}
	}
	function readLocalMedia() {
		try {
			return asMediaPreference(window.localStorage.getItem(MEDIA_EXPAND_STORAGE_KEY), window.localStorage.getItem(MEDIA_TIMESTAMP_KEY));
		} catch {
			return null;
		}
	}
	function writeLocalMedia(value) {
		try {
			window.localStorage.setItem(MEDIA_EXPAND_STORAGE_KEY, String(value.expanded));
			window.localStorage.setItem(MEDIA_TIMESTAMP_KEY, String(value.updatedAt));
		} catch {}
	}
	function readLocalInfiniteScroll() {
		try {
			return asInfiniteScrollPreference(window.localStorage.getItem(INFINITE_SCROLL_STORAGE_KEY), window.localStorage.getItem(INFINITE_SCROLL_TIMESTAMP_KEY));
		} catch {
			return null;
		}
	}
	function writeLocalInfiniteScroll(value) {
		try {
			window.localStorage.setItem(INFINITE_SCROLL_STORAGE_KEY, String(value.enabled));
			window.localStorage.setItem(INFINITE_SCROLL_TIMESTAMP_KEY, String(value.updatedAt));
		} catch {}
	}
	function openDatabase() {
		if (!("indexedDB" in window)) return Promise.resolve(null);
		return new Promise((resolve) => {
			try {
				const request = window.indexedDB.open(DATABASE_NAME, 1);
				request.onupgradeneeded = () => {
					if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
				};
				request.onsuccess = () => resolve(request.result);
				request.onerror = () => resolve(null);
				request.onblocked = () => resolve(null);
			} catch {
				resolve(null);
			}
		});
	}
	async function readIndexed() {
		const database = await openDatabase();
		if (!database) return null;
		return new Promise((resolve) => {
			try {
				const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(STORAGE_KEY);
				request.onsuccess = () => {
					const value = request.result;
					database.close();
					resolve(value && (value.mode === "enhanced" || value.mode === "original") && Number.isFinite(value.updatedAt) ? {
						mode: value.mode,
						updatedAt: value.updatedAt ?? 0
					} : null);
				};
				request.onerror = () => {
					database.close();
					resolve(null);
				};
			} catch {
				database.close();
				resolve(null);
			}
		});
	}
	async function writeIndexed(value) {
		const database = await openDatabase();
		if (!database) return;
		await new Promise((resolve) => {
			try {
				const transaction = database.transaction(STORE_NAME, "readwrite");
				transaction.objectStore(STORE_NAME).put(value, STORAGE_KEY);
				transaction.oncomplete = () => {
					database.close();
					resolve();
				};
				transaction.onerror = () => {
					database.close();
					resolve();
				};
				transaction.onabort = () => {
					database.close();
					resolve();
				};
			} catch {
				database.close();
				resolve();
			}
		});
	}
	async function readIndexedMedia() {
		const database = await openDatabase();
		if (!database) return null;
		return new Promise((resolve) => {
			try {
				const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(MEDIA_EXPAND_STORAGE_KEY);
				request.onsuccess = () => {
					const value = request.result;
					database.close();
					resolve(value && typeof value.expanded === "boolean" && Number.isFinite(value.updatedAt) ? {
						expanded: value.expanded,
						updatedAt: value.updatedAt ?? 0
					} : null);
				};
				request.onerror = () => {
					database.close();
					resolve(null);
				};
			} catch {
				database.close();
				resolve(null);
			}
		});
	}
	async function writeIndexedMedia(value) {
		const database = await openDatabase();
		if (!database) return;
		await new Promise((resolve) => {
			try {
				const transaction = database.transaction(STORE_NAME, "readwrite");
				transaction.objectStore(STORE_NAME).put(value, MEDIA_EXPAND_STORAGE_KEY);
				transaction.oncomplete = () => {
					database.close();
					resolve();
				};
				transaction.onerror = () => {
					database.close();
					resolve();
				};
				transaction.onabort = () => {
					database.close();
					resolve();
				};
			} catch {
				database.close();
				resolve();
			}
		});
	}
	async function readIndexedInfiniteScroll() {
		const database = await openDatabase();
		if (!database) return null;
		return new Promise((resolve) => {
			try {
				const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(INFINITE_SCROLL_STORAGE_KEY);
				request.onsuccess = () => {
					const value = request.result;
					database.close();
					resolve(value && typeof value.enabled === "boolean" && Number.isFinite(value.updatedAt) ? {
						enabled: value.enabled,
						updatedAt: value.updatedAt ?? 0
					} : null);
				};
				request.onerror = () => {
					database.close();
					resolve(null);
				};
			} catch {
				database.close();
				resolve(null);
			}
		});
	}
	async function writeIndexedInfiniteScroll(value) {
		const database = await openDatabase();
		if (!database) return;
		await new Promise((resolve) => {
			try {
				const transaction = database.transaction(STORE_NAME, "readwrite");
				transaction.objectStore(STORE_NAME).put(value, INFINITE_SCROLL_STORAGE_KEY);
				transaction.oncomplete = () => {
					database.close();
					resolve();
				};
				transaction.onerror = () => {
					database.close();
					resolve();
				};
				transaction.onabort = () => {
					database.close();
					resolve();
				};
			} catch {
				database.close();
				resolve();
			}
		});
	}
	function getFastStoredLayoutMode() {
		const local = readLocal();
		return local ? local.mode : "enhanced";
	}
	function getFastStoredMediaExpand() {
		const local = readLocalMedia();
		return local ? local.expanded : true;
	}
	function getFastStoredInfiniteScroll() {
		const local = readLocalInfiniteScroll();
		return local ? local.enabled : true;
	}
	async function readStoredLayoutMode() {
		const [local, indexed] = await Promise.all([Promise.resolve(readLocal()), readIndexed()]);
		const selected = [local, indexed].filter((value) => value !== null).sort((left, right) => right.updatedAt - left.updatedAt)[0];
		if (!selected) return "enhanced";
		if (!local || local.mode !== selected.mode || local.updatedAt !== selected.updatedAt) writeLocal(selected);
		return selected.mode;
	}
	async function writeStoredLayoutMode(mode) {
		const value = {
			mode,
			updatedAt: Date.now()
		};
		writeLocal(value);
		await writeIndexed(value);
	}
	async function readStoredMediaExpand() {
		const [local, indexed] = await Promise.all([Promise.resolve(readLocalMedia()), readIndexedMedia()]);
		const selected = [local, indexed].filter((value) => value !== null).sort((left, right) => right.updatedAt - left.updatedAt)[0];
		if (!selected) return true;
		if (!local || local.expanded !== selected.expanded || local.updatedAt !== selected.updatedAt) writeLocalMedia(selected);
		return selected.expanded;
	}
	async function writeStoredMediaExpand(expanded) {
		const value = {
			expanded,
			updatedAt: Date.now()
		};
		writeLocalMedia(value);
		await writeIndexedMedia(value);
	}
	async function readStoredInfiniteScroll() {
		const [local, indexed] = await Promise.all([Promise.resolve(readLocalInfiniteScroll()), readIndexedInfiniteScroll()]);
		const selected = [local, indexed].filter((value) => value !== null).sort((left, right) => right.updatedAt - left.updatedAt)[0];
		if (!selected) return true;
		if (!local || local.enabled !== selected.enabled || local.updatedAt !== selected.updatedAt) writeLocalInfiniteScroll(selected);
		return selected.enabled;
	}
	async function writeStoredInfiniteScroll(enabled) {
		const value = {
			enabled,
			updatedAt: Date.now()
		};
		writeLocalInfiniteScroll(value);
		await writeIndexedInfiniteScroll(value);
	}
	var paths = {
		popular: "<path d=\"M4 19V9m6 10V5m6 14v-7m4 7H2\"/><path d=\"M3 3h18v18H3z\" opacity=\"0\"/>",
		search: "<circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-4-4\"/>",
		eye: "<path d=\"M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/>",
		help: "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M9.8 9a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.4 1-1.4 2.1M12 17h.01\"/>",
		download: "<path d=\"M12 3v11m0 0 4-4m-4 4-4-4\"/><path d=\"M4 17v3h16v-3\"/>",
		features: "<path d=\"M8 6h13M8 12h13M8 18h13\"/><circle cx=\"4\" cy=\"6\" r=\"1\"/><circle cx=\"4\" cy=\"12\" r=\"1\"/><circle cx=\"4\" cy=\"18\" r=\"1\"/>",
		description: "<path d=\"M6 3h9l3 3v15H6z\"/><path d=\"M9 10h6M9 14h6M9 18h4M15 3v4h4\"/>",
		chevron: "<path d=\"m8 10 4 4 4-4\"/>",
		chevronLeft: "<path d=\"m15 18-6-6 6-6\"/>",
		chevronRight: "<path d=\"m9 18 6-6-6-6\"/>",
		external: "<path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3\"/>",
		zoomIn: "<circle cx=\"11\" cy=\"11\" r=\"8\"/><line x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"/><line x1=\"11\" y1=\"8\" x2=\"11\" y2=\"14\"/><line x1=\"8\" y1=\"11\" x2=\"14\" y2=\"11\"/>",
		zoomOut: "<circle cx=\"11\" cy=\"11\" r=\"8\"/><line x1=\"21\" y1=\"21\" x2=\"16.65\" y2=\"16.65\"/><line x1=\"8\" y1=\"11\" x2=\"14\" y2=\"11\"/>",
		zoomReset: "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/>",
		close: "<path d=\"m6 6 12 12M18 6 6 18\"/>",
		menu: "<path d=\"M4 7h16M4 12h16M4 17h16\"/>",
		calendar: "<path d=\"M5 4h14v16H5zM8 2v4m8-4v4M5 9h14\"/>",
		tag: "<path d=\"M4 4h7l9 9-7 7-9-9z\"/><circle cx=\"8\" cy=\"8\" r=\"1\"/>",
		building: "<path d=\"M5 21V6l7-3 7 3v15M9 8h1m4 0h1M9 12h1m4 0h1M9 16h1m4 0h1M3 21h18\"/>",
		language: "<path d=\"M4 5h9M8.5 3v2c0 5-2 8-5 10m3-6c1 2 3 4 6 5M14 19l3.5-9 3.5 9m-5.8-3h4.6\"/>",
		drive: "<path d=\"M5 5h14l2 10H3zM3 15v4h18v-4M17 17h.01\"/>"
	};
	function createIcon(name, className = "") {
		const wrapper = document.createElement("div");
		wrapper.innerHTML = `<svg class="fwe-icon ${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
		const icon = wrapper.firstElementChild;
		if (!(icon instanceof SVGSVGElement)) throw new Error(`无法创建图标：${name}`);
		return icon;
	}
	var FACT_ICONS = {
		"Genres/Tags": "tag",
		Company: "building",
		Languages: "language",
		"Original Size": "drive",
		"Repack Size": "download"
	};
	function element(tag, className, text) {
		const node = document.createElement(tag);
		if (className) node.className = className;
		if (text) node.textContent = text;
		return node;
	}
	function copyLinkAttributes(source, target) {
		target.href = source.href;
		for (const name of [
			"target",
			"rel",
			"title"
		]) {
			const value = source.getAttribute(name);
			if (value !== null) target.setAttribute(name, value);
		}
	}
	function prefersReducedMotion() {
		return typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
	}
	function transformDirectLinksSpoilers(container, transaction) {
		container.querySelectorAll(".su-spoiler").forEach((spoiler) => {
			const titleNode = spoiler.querySelector(".su-spoiler-title");
			const contentNode = spoiler.querySelector(".su-spoiler-content");
			if (!titleNode || !contentNode) return;
			const titleText = (titleNode.textContent ?? "").replace(/\s+/g, " ").trim() || "Click to show direct links";
			const details = element("details", "fwe-direct-links-details");
			const summary = element("summary", "fwe-direct-links-summary");
			summary.append(createIcon("chevron", "fwe-direct-links-chevron"), element("span", "", titleText));
			const body = element("div", "fwe-direct-links-content");
			transaction.insert(details, spoiler.parentElement ?? container, spoiler);
			transaction.move(contentNode, body);
			details.append(summary, body);
			transaction.addClass(spoiler, "fwe-source-hidden");
		});
	}
	var GameDetailModal = class {
		dialog;
		titleLink;
		titleText;
		tabsNav;
		body;
		tabButtons = new Map();
		tabPanes = new Map();
		currentPayload = null;
		currentPayloadParent = null;
		lastTrigger = null;
		isBackdropMouseDown = false;
		constructor() {
			this.dialog = element("dialog", "fwe-game-dialog");
			this.dialog.setAttribute("aria-label", "Game Details");
			const panel = element("div", "fwe-game-dialog__panel");
			const header = element("header", "fwe-game-dialog__header");
			const titleRow = element("div", "fwe-game-dialog__title-row");
			const heading = element("h2", "fwe-game-dialog__title");
			this.titleLink = element("a");
			this.titleText = element("span");
			heading.append(this.titleLink, this.titleText);
			const closeBtn = element("button", "fwe-icon-button fwe-game-dialog__close");
			closeBtn.type = "button";
			closeBtn.setAttribute("aria-label", "Close dialog (Esc)");
			closeBtn.append(createIcon("close"));
			closeBtn.addEventListener("click", () => this.close());
			titleRow.append(heading, closeBtn);
			this.tabsNav = element("nav", "fwe-game-dialog__tabs");
			this.tabsNav.setAttribute("role", "tablist");
			this.body = element("div", "fwe-game-dialog__body");
			header.append(titleRow, this.tabsNav);
			panel.append(header, this.body);
			this.dialog.append(panel);
			this.dialog.addEventListener("mousedown", (e) => {
				this.isBackdropMouseDown = e.target === this.dialog;
			});
			this.dialog.addEventListener("click", (e) => {
				if (this.isBackdropMouseDown && e.target === this.dialog) this.close();
				this.isBackdropMouseDown = false;
			});
			this.dialog.addEventListener("keydown", (e) => {
				if (e.key === "Escape") {
					e.preventDefault();
					this.close();
				}
			});
			this.dialog.addEventListener("close", () => {
				this.handleClose();
			});
			document.body.append(this.dialog);
		}
		open(params) {
			this.lastTrigger = params.trigger;
			if (params.titleHref) {
				this.titleLink.href = params.titleHref;
				this.titleLink.textContent = params.title;
				this.titleLink.style.display = "";
				this.titleText.textContent = "";
				this.titleText.style.display = "none";
			} else {
				this.titleLink.style.display = "none";
				this.titleText.textContent = params.title;
				this.titleText.style.display = "";
			}
			if (this.currentPayload && this.currentPayloadParent) {
				this.currentPayloadParent.append(this.currentPayload);
				this.currentPayload.style.setProperty("display", "none", "important");
			}
			this.currentPayload = params.payloadContainer;
			this.currentPayloadParent = params.payloadContainer.parentElement;
			this.body.innerHTML = "";
			this.tabsNav.innerHTML = "";
			this.tabButtons.clear();
			this.tabPanes.clear();
			this.currentPayload.style.setProperty("display", "block", "important");
			this.body.append(this.currentPayload);
			this.currentPayload.querySelectorAll(".fwe-game-dialog__pane").forEach((pane) => {
				const kind = pane.dataset.pane;
				if (!kind) return;
				this.tabPanes.set(kind, pane);
				const labelMap = {
					downloads: "Download Mirrors",
					features: "Repack Features",
					description: "Game Description"
				};
				const iconMap = {
					downloads: "download",
					features: "features",
					description: "description"
				};
				const tabBtn = element("button", "fwe-game-dialog__tab");
				tabBtn.type = "button";
				tabBtn.setAttribute("role", "tab");
				tabBtn.append(createIcon(iconMap[kind]), element("span", "", labelMap[kind]));
				tabBtn.addEventListener("click", () => this.setActiveTab(kind));
				this.tabsNav.append(tabBtn);
				this.tabButtons.set(kind, tabBtn);
			});
			const targetTab = this.tabPanes.has(params.initialTab) ? params.initialTab : this.tabPanes.keys().next().value;
			if (targetTab) this.setActiveTab(targetTab);
			if (!this.dialog.open) this.dialog.showModal();
			(targetTab ? this.tabButtons.get(targetTab) : null)?.focus();
		}
		setActiveTab(tab) {
			this.tabButtons.forEach((btn, kind) => {
				const active = kind === tab;
				btn.classList.toggle("fwe-game-dialog__tab--active", active);
				btn.setAttribute("aria-selected", String(active));
			});
			this.tabPanes.forEach((pane, kind) => {
				const active = kind === tab;
				pane.classList.toggle("fwe-game-dialog__pane--active", active);
				pane.hidden = !active;
				pane.style.setProperty("display", active ? "block" : "none", "important");
			});
			this.body.scrollTop = 0;
		}
		close() {
			if (this.dialog.open) this.dialog.close();
		}
		handleClose() {
			if (this.currentPayload && this.currentPayloadParent) {
				this.currentPayload.style.setProperty("display", "none", "important");
				this.currentPayloadParent.append(this.currentPayload);
				this.currentPayload = null;
				this.currentPayloadParent = null;
			}
			this.body.innerHTML = "";
			const trigger = this.lastTrigger;
			this.lastTrigger = null;
			if (trigger) requestAnimationFrame(() => {
				trigger.focus();
			});
		}
		destroy() {
			this.close();
			this.dialog.remove();
		}
	};
	function createCardPayload(article, transaction) {
		const payload = element("div", "fwe-card-payload");
		payload.style.setProperty("display", "none", "important");
		payload.setAttribute("aria-hidden", "true");
		const availableTabs = [];
		const downloads = article.sections.get("downloads");
		const features = article.sections.get("features");
		const description = article.sections.get("description");
		if (downloads) availableTabs.push({ kind: "downloads" });
		if (features) availableTabs.push({ kind: "features" });
		if (description) availableTabs.push({ kind: "description" });
		availableTabs.forEach(({ kind }) => {
			const pane = element("section", `fwe-game-dialog__pane fwe-game-dialog__pane--${kind}`);
			pane.dataset.pane = kind;
			pane.setAttribute("role", "tabpanel");
			pane.style.setProperty("display", "none", "important");
			pane.hidden = true;
			const section = article.sections.get(kind);
			if (section) {
				for (const node of section.nodes) {
					transaction.move(node, pane);
					if (kind === "description") {
						const content = node.querySelector(":scope > .su-spoiler-content");
						if (content) {
							transaction.addClass(node, "fwe-description-shell");
							transaction.move(content, pane);
						}
					}
				}
				if (kind === "downloads") transformDirectLinksSpoilers(pane, transaction);
			}
			payload.append(pane);
		});
		return payload;
	}
	function createCardActions(article, payload, gameModal) {
		const actions = element("div", "fwe-card-actions");
		const downloads = article.sections.get("downloads");
		const features = article.sections.get("features");
		const description = article.sections.get("description");
		const openTab = (tab, trigger) => {
			gameModal?.open({
				title: article.title ?? "Game Details",
				titleHref: article.titleLink?.href,
				payloadContainer: payload,
				initialTab: tab,
				trigger
			});
		};
		if (downloads) {
			const btn = element("button", "fwe-card-btn fwe-card-btn--primary");
			btn.type = "button";
			btn.append(createIcon("download"), element("span", "", "Download Mirrors"));
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				openTab("downloads", btn);
			});
			actions.append(btn);
		}
		if (features) {
			const btn = element("button", "fwe-card-btn");
			btn.type = "button";
			btn.append(createIcon("features"), element("span", "", "Features"));
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				openTab("features", btn);
			});
			actions.append(btn);
		}
		if (description) {
			const btn = element("button", "fwe-card-btn");
			btn.type = "button";
			btn.append(createIcon("description"), element("span", "", "Description"));
			btn.addEventListener("click", (e) => {
				e.stopPropagation();
				openTab("description", btn);
			});
			actions.append(btn);
		}
		return actions;
	}
	function createDetailSections(article, transaction) {
		const container = element("div", "fwe-detail-sections");
		for (const { kind, label, icon } of [
			{
				kind: "downloads",
				label: "Download Mirrors",
				icon: "download"
			},
			{
				kind: "features",
				label: "Repack Features",
				icon: "features"
			},
			{
				kind: "description",
				label: "Game Description",
				icon: "description"
			}
		]) {
			const section = article.sections.get(kind);
			if (!section) continue;
			const block = element("section", `fwe-detail-section fwe-detail-section--${kind}`);
			const blockHeader = element("div", "fwe-detail-section__header");
			blockHeader.append(createIcon(icon), element("h3", "fwe-detail-section__title", label));
			const blockContent = element("div", "fwe-detail-section__content");
			for (const node of section.nodes) {
				transaction.move(node, blockContent);
				if (kind === "description") {
					const content = node.querySelector(":scope > .su-spoiler-content");
					if (content) {
						transaction.addClass(node, "fwe-description-shell");
						transaction.move(content, blockContent);
					}
				}
			}
			if (kind === "downloads") transformDirectLinksSpoilers(blockContent, transaction);
			block.append(blockHeader, blockContent);
			container.append(block);
		}
		return container;
	}
	function createFacts(article) {
		const list = element("dl", "fwe-facts");
		for (const fact of extractFacts(article.infoBlock)) {
			const item = element("div", "fwe-fact");
			const term = element("dt", "fwe-fact__label");
			term.append(createIcon(FACT_ICONS[fact.label]), document.createTextNode(fact.label));
			const description = element("dd", "fwe-fact__value");
			if (fact.links.length > 0) fact.links.forEach((link, index) => {
				if (index > 0) description.append(document.createTextNode(", "));
				const anchor = element("a");
				anchor.href = link.href;
				anchor.textContent = link.text;
				description.append(anchor);
			});
			else description.textContent = fact.value;
			item.append(term, description);
			list.append(item);
		}
		return list;
	}
	function createSearchMeta(article) {
		const text = `${article.repackHeading?.textContent ?? ""} ${article.infoBlock?.textContent ?? ""}`;
		const labels = [text.match(/#\d+/)?.[0], /\bupdated\b/i.test(text) ? "Updated" : null].filter((item) => Boolean(item));
		if (labels.length === 0) return null;
		const meta = element("div", "fwe-search-meta");
		labels.forEach((label) => meta.append(element("span", "fwe-search-meta__item", label)));
		return meta;
	}
	function createSummaryPanel(article) {
		const panel = element("section", "fwe-summary-panel");
		panel.setAttribute("aria-label", "游戏基本信息");
		const isSearchResult = document.body.classList.contains("search-results");
		if (article.cover) {
			const cover = article.cover.cloneNode(true);
			cover.className = "fwe-cover";
			cover.loading = article.pageKind === "single" ? "eager" : "lazy";
			cover.decoding = "async";
			panel.append(cover);
		} else if (!isSearchResult) {
			const placeholder = element("div", "fwe-cover fwe-cover--placeholder", "No cover");
			placeholder.setAttribute("aria-hidden", "true");
			panel.append(placeholder);
		}
		const meta = isSearchResult ? createSearchMeta(article) : null;
		if (meta) panel.append(meta);
		const facts = createFacts(article);
		if (facts.childElementCount > 0) panel.append(facts);
		else if (isSearchResult) {
			const sourceText = (article.entry?.textContent ?? "").replace(/\s+/g, " ").trim();
			panel.append(element("p", "fwe-search-excerpt", sourceText.slice(0, 520)));
		}
		return panel;
	}
	function resolveMediaSource(item) {
		if (item.video) {
			const sourceEl = item.video.querySelector("source");
			const sourceSrc = sourceEl?.src || sourceEl?.getAttribute("src") || "";
			const videoSrc = item.video.src || item.video.currentSrc || item.video.getAttribute("src") || "";
			const anchorHref = /\.(mp4|webm|ogg|gif)(\?.*)?$/i.test(item.element.href) ? item.element.href : "";
			const finalVideoSrc = sourceSrc || videoSrc || anchorHref;
			if (finalVideoSrc) return {
				type: "video",
				src: finalVideoSrc
			};
		}
		if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(item.element.href)) return {
			type: "video",
			src: item.element.href
		};
		let src = item.image?.currentSrc || item.image?.src || item.image?.getAttribute("src") || "";
		let hdSrc;
		if (src.startsWith("http://")) src = src.replace(/^http:\/\//i, "https://");
		if (src.includes(".240p.jpg")) hdSrc = src.replace(/\.240p\.jpg$/, "");
		else if (/\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(item.element.href)) {
			let directHref = item.element.href;
			if (directHref.startsWith("http://")) directHref = directHref.replace(/^http:\/\//i, "https://");
			if (directHref !== src) hdSrc = directHref;
		}
		return {
			type: "image",
			src,
			hdSrc
		};
	}
	var ImageLightbox = class {
		dialog;
		counter;
		hdBadge;
		zoomLevelText;
		image;
		video;
		spinner;
		prevBtn;
		nextBtn;
		externalBtn;
		stage;
		items = [];
		currentIndex = 0;
		triggerElement = null;
		preloadedHd = new Set();
		scale = 1;
		translateX = 0;
		translateY = 0;
		isDragging = false;
		startX = 0;
		startY = 0;
		constructor() {
			this.dialog = element("dialog", "fwe-lightbox-dialog");
			this.dialog.setAttribute("aria-label", "截图与实机预览");
			const wrapper = element("div", "fwe-lightbox");
			const header = element("header", "fwe-lightbox__header");
			const metaGroup = element("div", "fwe-lightbox__meta");
			this.counter = element("span", "fwe-lightbox__counter", "1 / 1");
			this.hdBadge = element("span", "fwe-lightbox__hd-badge", "HD");
			metaGroup.append(this.counter, this.hdBadge);
			const toolbar = element("div", "fwe-lightbox__toolbar");
			const zoomOutBtn = element("button", "fwe-lightbox__btn");
			zoomOutBtn.type = "button";
			zoomOutBtn.title = "缩小 (Ctrl -)";
			zoomOutBtn.setAttribute("aria-label", "缩小");
			zoomOutBtn.append(createIcon("zoomOut"));
			zoomOutBtn.addEventListener("click", () => this.applyZoom(this.scale * .8));
			this.zoomLevelText = element("button", "fwe-lightbox__zoom-indicator", "100%");
			this.zoomLevelText.type = "button";
			this.zoomLevelText.title = "重置缩放 (Ctrl 0)";
			this.zoomLevelText.setAttribute("aria-label", "重置缩放");
			this.zoomLevelText.addEventListener("click", () => this.resetZoom());
			const zoomInBtn = element("button", "fwe-lightbox__btn");
			zoomInBtn.type = "button";
			zoomInBtn.title = "放大 (Ctrl +)";
			zoomInBtn.setAttribute("aria-label", "放大");
			zoomInBtn.append(createIcon("zoomIn"));
			zoomInBtn.addEventListener("click", () => this.applyZoom(this.scale * 1.25));
			const resetBtn = element("button", "fwe-lightbox__btn");
			resetBtn.type = "button";
			resetBtn.title = "自适应重置";
			resetBtn.setAttribute("aria-label", "自适应重置");
			resetBtn.append(createIcon("zoomReset"));
			resetBtn.addEventListener("click", () => this.resetZoom());
			toolbar.append(zoomOutBtn, this.zoomLevelText, zoomInBtn, resetBtn);
			const actions = element("div", "fwe-lightbox__actions");
			this.externalBtn = element("a", "fwe-lightbox__btn");
			this.externalBtn.target = "_blank";
			this.externalBtn.rel = "noopener noreferrer";
			this.externalBtn.title = "在新标签页打开原图网站";
			this.externalBtn.setAttribute("aria-label", "在新标签页打开原图网站");
			this.externalBtn.append(createIcon("external"));
			const closeBtn = element("button", "fwe-lightbox__btn fwe-lightbox__btn--close");
			closeBtn.type = "button";
			closeBtn.title = "关闭预览 (Esc)";
			closeBtn.setAttribute("aria-label", "关闭预览");
			closeBtn.append(createIcon("close"));
			closeBtn.addEventListener("click", () => this.close());
			actions.append(this.externalBtn, closeBtn);
			header.append(metaGroup, toolbar, actions);
			const body = element("div", "fwe-lightbox__body");
			this.prevBtn = element("button", "fwe-lightbox__nav fwe-lightbox__nav--prev");
			this.prevBtn.type = "button";
			this.prevBtn.title = "上一张 (←)";
			this.prevBtn.setAttribute("aria-label", "上一张");
			this.prevBtn.append(createIcon("chevronLeft"));
			this.prevBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.prev();
			});
			this.nextBtn = element("button", "fwe-lightbox__nav fwe-lightbox__nav--next");
			this.nextBtn.type = "button";
			this.nextBtn.title = "下一张 (→)";
			this.nextBtn.setAttribute("aria-label", "下一张");
			this.nextBtn.append(createIcon("chevronRight"));
			this.nextBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.next();
			});
			this.stage = element("div", "fwe-lightbox__stage");
			this.spinner = element("div", "fwe-lightbox__spinner");
			this.image = element("img", "fwe-lightbox__image");
			this.video = element("video", "fwe-lightbox__video");
			this.video.controls = true;
			this.video.playsInline = true;
			this.video.autoplay = true;
			this.video.loop = true;
			this.stage.append(this.spinner, this.image, this.video);
			body.append(this.prevBtn, this.stage, this.nextBtn);
			wrapper.append(header, body);
			this.dialog.append(wrapper);
			this.bindZoomAndDrag(this.stage);
			this.dialog.addEventListener("click", (event) => {
				if (event.target === this.dialog) this.close();
			});
			this.dialog.addEventListener("keydown", (event) => {
				if (event.key === "ArrowLeft") {
					event.preventDefault();
					this.prev();
				} else if (event.key === "ArrowRight") {
					event.preventDefault();
					this.next();
				} else if (event.key === "Escape") {
					event.preventDefault();
					this.close();
				} else if (event.key === "+" || event.key === "=" || event.ctrlKey && event.key === "=") {
					event.preventDefault();
					this.applyZoom(this.scale * 1.25);
				} else if (event.key === "-" || event.ctrlKey && event.key === "-") {
					event.preventDefault();
					this.applyZoom(this.scale * .8);
				} else if (event.key === "0" || event.ctrlKey && event.key === "0") {
					event.preventDefault();
					this.resetZoom();
				}
			});
			document.body.append(this.dialog);
		}
		bindZoomAndDrag(stage) {
			stage.addEventListener("wheel", (event) => {
				event.preventDefault();
				const factor = event.deltaY < 0 ? 1.16 : .86;
				const rect = stage.getBoundingClientRect();
				const focalX = event.clientX - (rect.left + rect.width / 2);
				const focalY = event.clientY - (rect.top + rect.height / 2);
				this.applyZoom(this.scale * factor, focalX, focalY);
			}, { passive: false });
			stage.addEventListener("dblclick", (event) => {
				event.preventDefault();
				if (this.scale > 1.05) this.resetZoom();
				else {
					const rect = stage.getBoundingClientRect();
					const focalX = event.clientX - (rect.left + rect.width / 2);
					const focalY = event.clientY - (rect.top + rect.height / 2);
					this.applyZoom(2.2, focalX, focalY);
				}
			});
			stage.addEventListener("pointerdown", (event) => {
				if (event.button !== 0 || this.scale <= 1) return;
				this.isDragging = true;
				this.startX = event.clientX - this.translateX;
				this.startY = event.clientY - this.translateY;
				stage.classList.add("is-dragging");
				stage.setPointerCapture(event.pointerId);
			});
			stage.addEventListener("pointermove", (event) => {
				if (!this.isDragging) return;
				this.translateX = event.clientX - this.startX;
				this.translateY = event.clientY - this.startY;
				this.updateTransform();
			});
			const endDrag = (event) => {
				if (!this.isDragging) return;
				this.isDragging = false;
				stage.classList.remove("is-dragging");
				try {
					stage.releasePointerCapture(event.pointerId);
				} catch {}
			};
			stage.addEventListener("pointerup", endDrag);
			stage.addEventListener("pointercancel", endDrag);
		}
		applyZoom(newScale, focalX = 0, focalY = 0) {
			const prevScale = this.scale;
			const clamped = Math.max(.6, Math.min(newScale, 5));
			this.scale = clamped;
			if (this.scale <= 1) {
				this.translateX = 0;
				this.translateY = 0;
			} else if (prevScale !== this.scale && focalX !== 0 && focalY !== 0) {
				const ratio = this.scale / prevScale;
				this.translateX = focalX - (focalX - this.translateX) * ratio;
				this.translateY = focalY - (focalY - this.translateY) * ratio;
			}
			this.zoomLevelText.textContent = `${Math.round(this.scale * 100)}%`;
			this.updateTransform();
		}
		resetZoom() {
			this.scale = 1;
			this.translateX = 0;
			this.translateY = 0;
			this.zoomLevelText.textContent = "100%";
			this.updateTransform();
		}
		updateTransform() {
			const target = this.items[this.currentIndex]?.type === "video" ? this.video : this.image;
			target.style.transform = `translate3d(${this.translateX}px, ${this.translateY}px, 0) scale(${this.scale})`;
			target.style.cursor = this.scale > 1 ? this.isDragging ? "grabbing" : "grab" : "default";
		}
		open(items, initialIndex, triggerElement) {
			if (items.length === 0) return;
			this.items = items;
			this.currentIndex = Math.max(0, Math.min(initialIndex, items.length - 1));
			this.triggerElement = triggerElement ?? null;
			this.resetZoom();
			this.render();
			if (!this.dialog.open) {
				if (typeof this.dialog.showModal === "function") this.dialog.showModal();
				else this.dialog.setAttribute("open", "");
			}
		}
		close() {
			if (this.dialog.open || this.dialog.hasAttribute("open")) {
				this.video.pause();
				this.video.src = "";
				this.resetZoom();
				if (typeof this.dialog.close === "function") this.dialog.close();
				else this.dialog.removeAttribute("open");
				if (this.triggerElement) this.triggerElement.focus();
			}
		}
		next() {
			if (this.items.length <= 1) return;
			this.resetZoom();
			this.currentIndex = (this.currentIndex + 1) % this.items.length;
			this.render();
		}
		prev() {
			if (this.items.length <= 1) return;
			this.resetZoom();
			this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
			this.render();
		}
		updateHdBadge(state) {
			this.hdBadge.className = "fwe-lightbox__hd-badge";
			if (state === "none") {
				this.hdBadge.style.display = "none";
				return;
			}
			this.hdBadge.style.display = "inline-flex";
			if (state === "video") {
				this.hdBadge.classList.add("fwe-lightbox__hd-badge--video");
				this.hdBadge.textContent = "VIDEO";
			} else if (state === "loading") {
				this.hdBadge.classList.add("fwe-lightbox__hd-badge--loading");
				this.hdBadge.textContent = "HD...";
			} else if (state === "ready") {
				this.hdBadge.classList.add("fwe-lightbox__hd-badge--ready");
				this.hdBadge.textContent = "HD";
			}
		}
		render() {
			const current = this.items[this.currentIndex];
			if (!current) return;
			this.counter.textContent = `${this.currentIndex + 1} / ${this.items.length}`;
			this.prevBtn.style.display = this.items.length > 1 ? "inline-flex" : "none";
			this.nextBtn.style.display = this.items.length > 1 ? "inline-flex" : "none";
			if (current.externalUrl) {
				this.externalBtn.href = current.externalUrl;
				this.externalBtn.style.display = "inline-flex";
			} else this.externalBtn.style.display = "none";
			if (current.type === "video") {
				this.image.style.display = "none";
				this.spinner.style.display = "none";
				this.video.style.display = "block";
				this.updateHdBadge("video");
				if (this.video.src !== current.src) {
					this.video.src = current.src;
					this.video.load();
				}
				this.video.play().catch(() => void 0);
			} else {
				this.video.pause();
				this.video.style.display = "none";
				this.image.style.display = "block";
				this.spinner.style.display = "none";
				this.image.alt = current.alt;
				const hd = current.hdSrc;
				if (hd && this.preloadedHd.has(hd)) {
					this.image.src = hd;
					this.updateHdBadge("ready");
				} else if (hd) {
					this.image.src = current.src;
					this.updateHdBadge("loading");
					const hdImage = new Image();
					hdImage.src = hd;
					hdImage.onload = () => {
						this.preloadedHd.add(hd);
						if (this.items[this.currentIndex] === current && this.dialog.open) {
							this.image.src = hd;
							this.updateHdBadge("ready");
						}
					};
					hdImage.onerror = () => {
						if (this.items[this.currentIndex] === current && this.dialog.open) this.updateHdBadge("none");
					};
				} else {
					this.image.src = current.src;
					this.updateHdBadge("ready");
				}
				this.image.style.opacity = "1";
			}
		}
		bindTrigger(anchor, items, index) {
			anchor.addEventListener("click", (event) => {
				event.preventDefault();
				this.open(items, index, anchor);
			});
		}
	};
	function prepareMedia(article, transaction, mediaExpanded = true, lightbox) {
		const screenshots = article.sections.get("screenshots");
		if (!screenshots || article.media.length === 0) return null;
		const media = element("details", "fwe-media");
		media.open = mediaExpanded;
		media.setAttribute("aria-label", "Screenshots and gameplay preview");
		const summary = element("summary", "fwe-media__summary");
		summary.append(createIcon("description"), element("span", "fwe-media__label", "Screenshots & Gameplay"), element("span", "fwe-media__count", String(article.media.length)), createIcon("chevron", "fwe-media__chevron"));
		const gallery = element("div", "fwe-media__gallery");
		const source = element("div", "fwe-media__source");
		media.append(summary, gallery, source);
		screenshots.nodes.forEach((node) => transaction.move(node, source));
		const ordered = [...article.media.filter((item) => item.image), ...article.media.filter((item) => item.video)];
		const lightboxMedia = ordered.map((item) => {
			const resolved = resolveMediaSource(item);
			return {
				type: resolved.type,
				src: resolved.src,
				hdSrc: resolved.hdSrc,
				externalUrl: item.element.href || void 0,
				alt: item.image?.alt || article.title || "Screenshot preview"
			};
		});
		ordered.forEach((item, index) => {
			transaction.move(item.element, gallery);
			transaction.addClass(item.element, "fwe-media__item");
			transaction.setAttribute(item.element, "data-fwe-media-index", String(index + 1));
			if (item.image) {
				transaction.setAttribute(item.image, "loading", article.pageKind === "single" && index < 2 ? "eager" : "lazy");
				transaction.setAttribute(item.image, "decoding", "async");
			}
			if (item.video) {
				transaction.setAttribute(item.video, "autoplay", null);
				transaction.setAttribute(item.video, "preload", "metadata");
				transaction.setAttribute(item.video, "playsinline", "");
				transaction.addClass(item.video, "fwe-observed-video");
			}
			if (lightbox) lightbox.bindTrigger(item.element, lightboxMedia, index);
		});
		return media;
	}
	function addArticleMeta(article, transaction) {
		const header = article.header;
		if (!header || header.querySelector(".fwe-article-meta")) return;
		const timeNode = header.querySelector("time");
		const originalDate = header.querySelector(".entry-date") || timeNode;
		if (!originalDate && !timeNode) return;
		const displayDateText = (timeNode?.textContent || originalDate?.textContent || "").trim();
		const meta = element("div", "fwe-article-meta");
		meta.append(createIcon("calendar"), document.createTextNode(displayDateText));
		transaction.insert(meta, header);
		if (header.querySelector(".entry-title") && !header.querySelector(".fwe-time-ago")) {
			const parsedDate = parseArticleDate(originalDate, header);
			let timeText = displayDateText;
			if (parsedDate) timeText = formatRelativeTime(parsedDate);
			const rightBox = element("div", "fwe-header-right");
			const timeBadge = element("span", "fwe-time-ago", timeText);
			rightBox.append(timeBadge);
			transaction.insert(rightBox, header);
		}
	}
	function hideSearchSource(article, transaction) {
		const entry = article.entry;
		if (!entry) return;
		const source = element("div", "fwe-search-source fwe-source-hidden");
		transaction.insert(source, entry, entry.firstChild);
		[...entry.childNodes].filter((node) => node !== source).forEach((node) => transaction.move(node, source));
	}
	function transformGame(article, transaction, mediaExpanded = true, lightbox, gameModal) {
		if (!article.entry || article.root.hasAttribute("data-fwe-ready")) return;
		transaction.setAttribute(article.root, "data-fwe-ready", "true");
		transaction.addClass(article.root, article.pageKind === "single" ? "fwe-detail" : "fwe-game-card");
		const isSearch = document.body.classList.contains("search-results");
		if (isSearch) transaction.addClass(article.root, "fwe-search-card");
		addArticleMeta(article, transaction);
		if (isSearch) hideSearchSource(article, transaction);
		else {
			if (article.infoBlock) transaction.addClass(article.infoBlock, "fwe-source-hidden");
			if (article.repackHeading) transaction.addClass(article.repackHeading, "fwe-source-hidden");
		}
		const isDetail = article.pageKind === "single";
		const layout = element("div", "fwe-game-layout");
		layout.append(createSummaryPanel(article));
		const media = prepareMedia(article, transaction, isDetail ? true : mediaExpanded, lightbox);
		if (media) layout.append(media);
		transaction.insert(layout, article.entry, article.entry.firstChild);
		if (isDetail) {
			const detailSections = createDetailSections(article, transaction);
			if (detailSections.childElementCount > 0) transaction.insert(detailSections, article.entry);
		} else {
			const payload = createCardPayload(article, transaction);
			const actions = createCardActions(article, payload, gameModal);
			if (actions.childElementCount > 0) {
				transaction.insert(actions, article.entry);
				transaction.insert(payload, article.root);
			}
		}
	}
	function transformUpcoming(article, transaction) {
		if (!article.entry || article.root.hasAttribute("data-fwe-ready")) return;
		transaction.setAttribute(article.root, "data-fwe-ready", "true");
		transaction.addClass(article.root, "fwe-upcoming");
		const items = parseUpcomingItems(article.entry);
		const details = element("details", "fwe-upcoming__details");
		const summary = element("summary", "fwe-upcoming__summary");
		summary.append(element("span", "fwe-upcoming__eyebrow", "Upcoming Repacks"), createIcon("chevron"));
		const body = element("div", "fwe-upcoming__body");
		items.forEach((item, index) => {
			if (index > 0) body.append(element("span", "fwe-upcoming__separator", "→"));
			const link = element("a");
			link.textContent = item.text;
			if (item.href) link.href = item.href;
			else link.href = `/?s=${encodeURIComponent(item.text)}`;
			body.append(link);
		});
		const source = element("div", "fwe-upcoming__source");
		details.append(summary, body, source);
		transaction.insert(details, article.entry, article.entry.firstChild);
		[...article.entry.childNodes].filter((child) => child !== details).forEach((child) => transaction.move(child, source));
		const media = window.matchMedia("(min-width: 48rem)");
		const sync = () => {
			details.open = media.matches;
		};
		sync();
		media.addEventListener("change", sync);
		transaction.onRestore(() => media.removeEventListener("change", sync));
	}
	function transformLegacySpoilers(article, transaction) {
		article.entry?.querySelectorAll(".su-spoiler").forEach((spoiler) => {
			const title = (spoiler.querySelector(".su-spoiler-title")?.textContent ?? "").replace(/\s+/g, " ").trim();
			const content = spoiler.querySelector(".su-spoiler-content");
			const parent = spoiler.parentNode;
			if (!title || !content || !parent) return;
			const details = element("details", "fwe-inline-disclosure");
			const summary = element("summary", "fwe-inline-disclosure__summary");
			summary.append(element("span", "", title), createIcon("chevron"));
			const body = element("div", "fwe-inline-disclosure__content");
			details.append(summary, body);
			transaction.insert(details, parent, spoiler);
			transaction.move(content, body);
			transaction.addClass(spoiler, "fwe-source-hidden");
		});
	}
	function createSearchFallback(article, transaction) {
		if (!article.entry) return;
		const text = (article.entry.textContent ?? "").replace(/\s+/g, " ").trim();
		const panel = element("div", "fwe-search-fallback");
		panel.append(element("p", "", text.slice(0, 620)));
		if (article.titleLink) {
			const link = element("a", "fwe-search-fallback__link", "View details");
			copyLinkAttributes(article.titleLink, link);
			panel.append(link);
		}
		transaction.addClass(article.entry, "fwe-source-hidden");
		transaction.insert(panel, article.root, article.entry);
	}
	function preparePopularDirectory(article, transaction) {
		if (!article.entry) return;
		article.entry.querySelectorAll("style").forEach((style) => transaction.setAttribute(style, "media", "not all"));
		const widget = article.entry.querySelector(".jetpack_top_posts_widget");
		if (!widget) return;
		const links = [...widget.querySelectorAll("a[href]")].filter((link) => Boolean(link.querySelector("img")));
		if (links.length === 0) return;
		const heading = element("h2", "fwe-directory-heading", "Most Popular Repacks of the Month");
		const grid = element("div", "fwe-directory-grid");
		transaction.insert(heading, article.entry, widget);
		transaction.insert(grid, article.entry, widget);
		links.forEach((link) => {
			const image = link.querySelector("img");
			const title = link.getAttribute("title")?.trim() || image?.alt.trim() || "Popular repack";
			transaction.move(link, grid);
			transaction.addClass(link, "fwe-directory-tile");
			if (image) {
				transaction.setAttribute(image, "loading", "lazy");
				transaction.setAttribute(image, "decoding", "async");
			}
			transaction.insert(element("span", "fwe-directory-tile__title", title), link);
		});
		transaction.addClass(widget, "fwe-source-hidden");
	}
	function transformSpecial(article, transaction) {
		transaction.setAttribute(article.root, "data-fwe-ready", "true");
		const title = article.title.toLowerCase();
		if (document.body.classList.contains("search-results")) {
			transaction.addClass(article.root, "fwe-result-card");
			createSearchFallback(article, transaction);
			return;
		}
		transaction.addClass(article.root, "fwe-special");
		if (article.root.classList.contains("category-updates-digest") || title.startsWith("updates digest")) {
			transaction.addClass(article.root, "fwe-digest");
			transformLegacySpoilers(article, transaction);
		} else if (title === "popular repacks") {
			transaction.addClass(article.root, "fwe-directory-popular");
			preparePopularDirectory(article, transaction);
		} else if (/all my repacks.*a.?z/i.test(article.title)) transaction.addClass(article.root, "fwe-directory-az");
		else if (title === "updates list") {
			transaction.addClass(article.root, "fwe-directory-updates");
			transformLegacySpoilers(article, transaction);
		}
	}
	function createSearchForm() {
		const form = element("form", "fwe-search");
		form.method = "get";
		form.action = `${window.location.origin}/`;
		form.setAttribute("role", "search");
		const input = element("input", "fwe-search__input");
		input.type = "search";
		input.name = "s";
		input.placeholder = "Search repacks…";
		input.setAttribute("aria-label", "搜索游戏与文章");
		input.value = new URLSearchParams(window.location.search).get("s") ?? "";
		const submit = element("button", "fwe-search__submit");
		submit.type = "submit";
		submit.setAttribute("aria-label", "提交搜索");
		submit.append(createIcon("search"));
		form.append(input, submit);
		return form;
	}
	function createPopularDialog(items) {
		const dialog = element("dialog", "fwe-popular-dialog");
		dialog.setAttribute("aria-labelledby", "fwe-popular-title");
		const header = element("header", "fwe-dialog__header");
		const heading = element("h2", "", "Most Popular Repacks");
		heading.id = "fwe-popular-title";
		const close = element("button", "fwe-icon-button");
		close.type = "button";
		close.setAttribute("aria-label", "关闭热门榜单");
		close.append(createIcon("close"));
		header.append(heading, close);
		const list = element("ol", "fwe-popular-list");
		items.forEach((item) => {
			const row = element("li", "fwe-popular-item");
			const anchor = element("a", "fwe-popular-item__link");
			anchor.href = item.href;
			anchor.append(element("span", "fwe-popular-item__rank", String(item.rank).padStart(2, "0")));
			if (item.imageUrl) {
				const image = element("img", "fwe-popular-item__image");
				image.src = item.imageUrl;
				image.alt = "";
				image.loading = "lazy";
				anchor.append(image);
			}
			anchor.append(element("span", "fwe-popular-item__title", item.title));
			row.append(anchor);
			list.append(row);
		});
		dialog.append(header, list);
		close.addEventListener("click", () => dialog.close());
		dialog.addEventListener("click", (event) => {
			if (event.target === dialog) dialog.close();
		});
		return dialog;
	}
	function appendNavigation(parent, items) {
		const list = element("ul", "fwe-browse-nav");
		items.forEach((item) => {
			const row = element("li");
			const link = element("a");
			link.href = item.href;
			link.textContent = item.title;
			if (item.target) link.target = item.target;
			if (item.rel) link.rel = item.rel;
			row.append(link);
			if (item.children.length > 0) appendNavigation(row, item.children);
			list.append(row);
		});
		parent.append(list);
	}
	function appendArchives(parent, groups) {
		const section = element("section", "fwe-archives");
		section.append(element("h2", "", "Monthly Archives"));
		groups.forEach((group, index) => {
			const details = element("details", "fwe-archive-year");
			details.open = index === 0;
			const summary = element("summary", "", group.year);
			const list = element("ul");
			group.items.forEach((item) => {
				const row = element("li");
				const link = element("a", "", item.label);
				link.href = item.href;
				row.append(link);
				if (item.count) row.append(element("span", "fwe-archive-count", item.count));
				list.append(row);
			});
			details.append(summary, list);
			section.append(details);
		});
		parent.append(section);
	}
	function createBrowseDialog(items, groups) {
		const dialog = element("dialog", "fwe-browse-dialog");
		dialog.setAttribute("aria-labelledby", "fwe-browse-title");
		const header = element("header", "fwe-dialog__header");
		const title = element("h2", "", "Browse FitGirl");
		title.id = "fwe-browse-title";
		const close = element("button", "fwe-icon-button");
		close.type = "button";
		close.setAttribute("aria-label", "关闭浏览菜单");
		close.append(createIcon("close"));
		header.append(title, close);
		const content = element("div", "fwe-browse-dialog__content");
		appendNavigation(content, items);
		appendArchives(content, groups);
		dialog.append(header, content);
		close.addEventListener("click", () => dialog.close());
		dialog.addEventListener("click", (event) => {
			if (event.target === dialog) dialog.close();
		});
		return dialog;
	}
	var FitGirlEnhancedApp = class {
		mode;
		mediaExpanded;
		infiniteScroll;
		transaction = null;
		observer = null;
		videoObserver = null;
		infiniteObserver = null;
		processing = false;
		loadingNextPage = false;
		hasNextPage = true;
		observerTimer = null;
		viewControl;
		switchButton;
		mediaSwitchButton;
		infiniteSwitchButton;
		popularButton;
		browseButton;
		popularDialog;
		browseDialog;
		searchForm;
		lightbox;
		gameModal;
		hasPopularItems;
		lastDialogTrigger = null;
		activeColCount = 2;
		resizeListenerAttached = false;
		constructor() {
			this.mode = getFastStoredLayoutMode();
			this.mediaExpanded = getFastStoredMediaExpand();
			this.infiniteScroll = getFastStoredInfiniteScroll();
			this.lightbox = new ImageLightbox();
			this.gameModal = new GameDetailModal();
			const popularItems = parsePopularItems(document.querySelector("#block-2"));
			this.hasPopularItems = popularItems.length > 0;
			this.popularDialog = createPopularDialog(popularItems);
			this.browseDialog = createBrowseDialog(parseNavigation(document.querySelector("#site-header-menu, #primary-navigation")), parseArchiveGroups(document.querySelector(".widget_archive")));
			document.body.append(this.popularDialog, this.browseDialog);
			this.searchForm = createSearchForm();
			this.popularButton = element("button", "fwe-popular-button");
			this.popularButton.type = "button";
			this.popularButton.setAttribute("aria-label", "打开热门榜单");
			this.popularButton.append(createIcon("popular"), document.createTextNode("Popular"));
			this.browseButton = element("button", "fwe-browse-button");
			this.browseButton.type = "button";
			this.browseButton.setAttribute("aria-label", "浏览站点路由和月度归档");
			this.browseButton.append(createIcon("menu"), element("span", "", "Browse"));
			this.viewControl = element("details", "fwe-view-control");
			const viewSummary = element("summary", "fwe-view-control__trigger");
			viewSummary.append(createIcon("eye"), element("span", "", "View"));
			const panel = element("div", "fwe-view-control__panel");
			const layoutRow = element("div", "fwe-view-control__row");
			layoutRow.append(element("span", "fwe-view-control__label", "Enhanced View"));
			this.switchButton = element("button", "fwe-switch");
			this.switchButton.type = "button";
			this.switchButton.setAttribute("role", "switch");
			this.switchButton.setAttribute("aria-label", "切换增强布局与原站布局");
			this.switchButton.append(element("span", "fwe-switch__thumb"));
			layoutRow.append(this.switchButton);
			const mediaRow = element("div", "fwe-view-control__row");
			mediaRow.append(element("span", "fwe-view-control__label", "Expand Screenshots"));
			this.mediaSwitchButton = element("button", "fwe-switch");
			this.mediaSwitchButton.type = "button";
			this.mediaSwitchButton.setAttribute("role", "switch");
			this.mediaSwitchButton.setAttribute("aria-label", "切换截图与实机预览默认展开状态");
			this.mediaSwitchButton.append(element("span", "fwe-switch__thumb"));
			mediaRow.append(this.mediaSwitchButton);
			const infiniteRow = element("div", "fwe-view-control__row");
			infiniteRow.append(element("span", "fwe-view-control__label", "Infinite Scroll"));
			this.infiniteSwitchButton = element("button", "fwe-switch");
			this.infiniteSwitchButton.type = "button";
			this.infiniteSwitchButton.setAttribute("role", "switch");
			this.infiniteSwitchButton.setAttribute("aria-label", "切换瀑布流无限滚动加载");
			this.infiniteSwitchButton.append(element("span", "fwe-switch__thumb"));
			infiniteRow.append(this.infiniteSwitchButton);
			panel.append(layoutRow, mediaRow, infiniteRow);
			this.viewControl.append(viewSummary, panel);
			this.mountControls();
			this.applyMode(this.mode);
			this.applyMediaExpand(this.mediaExpanded);
			this.applyInfiniteScroll(this.infiniteScroll);
			this.switchButton.addEventListener("click", () => void this.setMode(this.mode === "enhanced" ? "original" : "enhanced"));
			this.mediaSwitchButton.addEventListener("click", () => void this.setMediaExpand(!this.mediaExpanded));
			this.infiniteSwitchButton.addEventListener("click", () => void this.setInfiniteScroll(!this.infiniteScroll));
			this.popularButton.addEventListener("click", () => this.openDialog(this.popularDialog, this.popularButton));
			this.browseButton.addEventListener("click", () => this.openDialog(this.browseDialog, this.browseButton));
			[this.popularDialog, this.browseDialog].forEach((dialog) => {
				dialog.addEventListener("close", () => {
					this.lastDialogTrigger?.focus();
					this.lastDialogTrigger = null;
				});
				dialog.addEventListener("keydown", (event) => this.trapDialogFocus(dialog, event));
			});
		}
		async start() {
			const [mode, mediaExpanded, infiniteScroll] = await Promise.all([
				readStoredLayoutMode(),
				readStoredMediaExpand(),
				readStoredInfiniteScroll()
			]);
			if (this.mode !== mode) {
				this.mode = mode;
				this.applyMode(this.mode);
			}
			if (this.mediaExpanded !== mediaExpanded) {
				this.mediaExpanded = mediaExpanded;
				this.applyMediaExpand(this.mediaExpanded);
			}
			if (this.infiniteScroll !== infiniteScroll) {
				this.infiniteScroll = infiniteScroll;
				this.applyInfiniteScroll(this.infiniteScroll);
			}
		}
		mountControls() {
			(document.querySelector("#masthead .site-header-main") ?? document.querySelector("#masthead .header-main") ?? document.querySelector("#masthead") ?? document.body).append(this.searchForm, this.popularButton, this.browseButton, this.viewControl);
		}
		async setMode(mode) {
			this.switchButton.disabled = true;
			await writeStoredLayoutMode(mode);
			this.applyMode(mode);
			this.switchButton.disabled = false;
		}
		async setMediaExpand(expanded) {
			this.mediaSwitchButton.disabled = true;
			await writeStoredMediaExpand(expanded);
			this.mediaExpanded = expanded;
			this.applyMediaExpand(expanded);
			this.mediaSwitchButton.disabled = false;
		}
		applyMediaExpand(expanded) {
			this.mediaSwitchButton.setAttribute("aria-checked", String(expanded));
			document.querySelectorAll(".fwe-media").forEach((media) => {
				media.open = expanded;
			});
		}
		async setInfiniteScroll(enabled) {
			this.infiniteSwitchButton.disabled = true;
			await writeStoredInfiniteScroll(enabled);
			this.infiniteScroll = enabled;
			this.applyInfiniteScroll(enabled);
			this.infiniteSwitchButton.disabled = false;
		}
		applyInfiniteScroll(enabled) {
			this.infiniteSwitchButton.setAttribute("aria-checked", String(enabled));
			const nav = document.querySelector("#content > .navigation, #content > .paging-navigation");
			const sentinel = document.querySelector("#content > .fwe-infinite-sentinel");
			if (enabled && this.mode === "enhanced") {
				if (nav) nav.style.display = "none";
				if (sentinel) sentinel.style.display = "";
				this.setupInfiniteScroll();
			} else {
				if (nav) nav.style.display = "";
				if (sentinel) sentinel.style.display = "none";
				this.infiniteObserver?.disconnect();
				this.infiniteObserver = null;
			}
		}
		applyMode(mode) {
			if (this.transaction) this.disableEnhanced();
			this.mode = mode;
			document.documentElement.dataset.fweMode = mode;
			this.switchButton.setAttribute("aria-checked", String(mode === "enhanced"));
			this.searchForm.hidden = mode !== "enhanced";
			this.popularButton.hidden = mode !== "enhanced" || !this.hasPopularItems;
			this.browseButton.hidden = mode !== "enhanced";
			this.viewControl.open = false;
			if (mode === "enhanced") this.enableEnhanced();
		}
		computeColumnCount() {
			const width = window.innerWidth;
			if (width >= 2400) return 4;
			if (width >= 1700) return 3;
			if (width >= 1152) return 2;
			return 1;
		}
		initResizeListener() {
			if (this.resizeListenerAttached) return;
			this.resizeListenerAttached = true;
			let timer;
			window.addEventListener("resize", () => {
				if (this.mode !== "enhanced") return;
				window.clearTimeout(timer);
				timer = window.setTimeout(() => {
					const nextCols = this.computeColumnCount();
					if (nextCols !== this.activeColCount) {
						this.activeColCount = nextCols;
						this.processArticles();
					}
				}, 150);
			});
		}
		enableEnhanced() {
			this.initResizeListener();
			this.transaction = new DomTransaction();
			document.querySelectorAll(".widget_archive").forEach((widget) => {
				this.transaction?.addClass(widget, "fwe-source-hidden");
			});
			this.prepareNavigation();
			this.processArticles();
			this.observeChanges();
			this.observeVideos();
		}
		disableEnhanced() {
			if (this.observerTimer !== null) {
				window.clearTimeout(this.observerTimer);
				this.observerTimer = null;
			}
			this.lightbox.close();
			this.gameModal.close();
			this.observer?.disconnect();
			this.observer = null;
			this.videoObserver?.disconnect();
			this.videoObserver = null;
			document.querySelectorAll(".fwe-observed-video").forEach((video) => video.pause());
			if (this.popularDialog.open) this.popularDialog.close();
			if (this.browseDialog.open) this.browseDialog.close();
			this.infiniteObserver?.disconnect();
			this.infiniteObserver = null;
			const sentinel = document.querySelector("#content > .fwe-infinite-sentinel");
			if (sentinel) sentinel.remove();
			this.transaction?.restore();
			this.transaction = null;
		}
		prepareNavigation() {
			const list = document.querySelector("#site-header-menu .nav-menu, #primary-navigation .nav-menu");
			if (!list || !this.transaction) return;
			[...list.children].forEach((item, index) => {
				if (!(item instanceof HTMLElement)) return;
				this.transaction?.addClass(item, index < 4 ? "fwe-nav-priority" : "fwe-nav-overflow");
			});
		}
		processArticles() {
			if (!this.transaction || this.processing) return;
			this.processing = true;
			const activeObserver = this.observer;
			if (activeObserver) {
				activeObserver.disconnect();
				this.observer = null;
			}
			const pageKind = detectPageKind();
			const isSingle = pageKind === "single" || document.body.matches(".single, .single-post, .page, .singular") || Boolean(document.querySelector(".single-post, .singular"));
			const content = document.querySelector("#content");
			const articles = [...document.querySelectorAll("#content article.hentry, article.hentry")];
			let upcomingArticle = null;
			const cardsToLayout = [];
			for (const root of articles) {
				const isTransformed = root.hasAttribute("data-fwe-ready");
				let kind = "special";
				if (!isTransformed) {
					const article = parseArticle(root, pageKind);
					kind = article.kind;
					if (article.kind === "game") transformGame(article, this.transaction, this.mediaExpanded, this.lightbox, this.gameModal);
					else if (article.kind === "upcoming") transformUpcoming(article, this.transaction);
					else transformSpecial(article, this.transaction);
				} else if (root.matches(".fwe-upcoming")) kind = "upcoming";
				else if (root.matches(".fwe-game-card")) kind = "game";
				if (kind === "upcoming" || root.matches(".fwe-upcoming")) upcomingArticle = root;
				else if (!isSingle && !root.matches(".fwe-directory-popular, .fwe-directory-az, .fwe-directory-updates")) {
					if (!root.hasAttribute("data-fwe-seq")) this.transaction.setAttribute(root, "data-fwe-seq", String(cardsToLayout.length + 1));
					cardsToLayout.push(root);
				}
			}
			cardsToLayout.sort((a, b) => {
				return (Number(a.getAttribute("data-fwe-seq")) || 0) - (Number(b.getAttribute("data-fwe-seq")) || 0);
			});
			if (!isSingle && content) {
				[...content.children].forEach((child) => {
					if (child instanceof HTMLElement && !child.matches("article, .fwe-stream, .fwe-infinite-sentinel, .page-header, .navigation, .paging-navigation, .post-navigation")) this.transaction?.addClass(child, "fwe-source-hidden");
				});
				const pageHeader = content.querySelector(":scope > .page-header");
				if (upcomingArticle) {
					const expectedAnchor = pageHeader ? pageHeader.nextSibling : content.firstChild;
					if (upcomingArticle.parentElement !== content || upcomingArticle.previousElementSibling !== pageHeader) this.transaction.move(upcomingArticle, content, expectedAnchor);
				}
				const targetColCount = this.computeColumnCount();
				this.activeColCount = targetColCount;
				let stream = content.querySelector(":scope > .fwe-stream");
				const streamAnchor = upcomingArticle ? upcomingArticle.nextSibling : pageHeader ? pageHeader.nextSibling : content.firstChild;
				if (!stream) {
					stream = element("div", "fwe-stream");
					this.transaction.insert(stream, content, streamAnchor);
				} else if (stream.previousElementSibling !== (upcomingArticle ?? pageHeader)) content.insertBefore(stream, streamAnchor);
				stream.setAttribute("data-cols", String(targetColCount));
				stream.style.setProperty("--fwe-cols", String(targetColCount));
				cardsToLayout.forEach((card, index) => {
					const header = card.querySelector(".entry-header");
					if (header) {
						const badge = header.querySelector(".fwe-order-badge");
						const expectedBadgeText = `#${index + 1}`;
						const expectedRank = String(index + 1);
						if (badge) {
							if (badge.textContent !== expectedBadgeText) badge.textContent = expectedBadgeText;
							if (badge.getAttribute("data-rank") !== expectedRank) badge.setAttribute("data-rank", expectedRank);
						} else {
							const newBadge = element("span", "fwe-order-badge", expectedBadgeText);
							newBadge.setAttribute("data-rank", expectedRank);
							this.transaction?.insert(newBadge, header, header.firstChild);
						}
					}
					const expectedRank = index < 3 ? String(index + 1) : null;
					if (card.getAttribute("data-fwe-rank") !== expectedRank) this.transaction?.setAttribute(card, "data-fwe-rank", expectedRank);
					if (card.parentElement !== stream) this.transaction?.move(card, stream);
					else if (stream.children[index] !== card) stream.insertBefore(card, stream.children[index] ?? null);
				});
				let sentinel = content.querySelector(":scope > .fwe-infinite-sentinel");
				if (!sentinel) {
					sentinel = element("div", "fwe-infinite-sentinel");
					this.transaction.insert(sentinel, content, stream.nextSibling);
				} else if (stream && sentinel.previousElementSibling !== stream) content.insertBefore(sentinel, stream.nextSibling);
				const nav = content.querySelector(":scope > .navigation, :scope > .paging-navigation, :scope > .post-navigation");
				if (nav && sentinel && nav.previousElementSibling !== sentinel) this.transaction.move(nav, content, sentinel.nextSibling);
				this.applyInfiniteScroll(this.infiniteScroll);
			}
			this.processing = false;
			if (this.mode === "enhanced") this.observeChanges();
		}
		observeChanges() {
			if (this.observer) return;
			const target = document.querySelector("#content") ?? document.body;
			this.observer = new MutationObserver((mutations) => {
				if (this.processing || this.mode !== "enhanced") return;
				if (!mutations.some((mutation) => [...mutation.addedNodes].some((node) => node instanceof HTMLElement && (node.matches("article.hentry:not([data-fwe-ready])") || Boolean(node.querySelector("article.hentry:not([data-fwe-ready])")))))) return;
				if (this.observerTimer !== null) window.clearTimeout(this.observerTimer);
				this.observerTimer = window.setTimeout(() => {
					this.observerTimer = null;
					if (this.processing || this.mode !== "enhanced") return;
					this.processArticles();
					this.observeVideos();
				}, 100);
			});
			this.observer.observe(target, {
				childList: true,
				subtree: true
			});
		}
		observeVideos() {
			if (prefersReducedMotion() || !("IntersectionObserver" in window)) return;
			if (!this.videoObserver) this.videoObserver = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					const video = entry.target;
					if (!(video instanceof HTMLVideoElement)) return;
					if ((video.closest("details")?.open ?? true) && entry.isIntersecting && entry.intersectionRatio >= .6) video.play().catch(() => void 0);
					else video.pause();
				});
			}, { threshold: [0, .6] });
			document.querySelectorAll(".fwe-observed-video").forEach((video) => this.videoObserver?.observe(video));
		}
		openDialog(dialog, trigger) {
			if (this.mode !== "enhanced" || dialog.open) return;
			this.lastDialogTrigger = trigger;
			dialog.showModal();
			dialog.querySelector("button, a, summary")?.focus();
		}
		trapDialogFocus(dialog, event) {
			if (event.key !== "Tab") return;
			const focusable = [...dialog.querySelectorAll("button:not([disabled]), a[href], summary")].filter((item) => !item.hidden);
			const first = focusable[0];
			const last = focusable.at(-1);
			if (!first || !last) return;
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}
		setupInfiniteScroll() {
			if (!this.infiniteScroll || !this.hasNextPage || this.mode !== "enhanced") return;
			const sentinel = document.querySelector("#content > .fwe-infinite-sentinel");
			if (!sentinel) return;
			if (!this.infiniteObserver) this.infiniteObserver = new IntersectionObserver((entries) => {
				if (entries.some((e) => e.isIntersecting)) this.loadNextPage();
			}, { rootMargin: "600px 0px 600px 0px" });
			this.infiniteObserver.observe(sentinel);
		}
		async loadNextPage() {
			if (this.loadingNextPage || !this.hasNextPage || !this.infiniteScroll) return;
			const nextLink = document.querySelector("#content .nav-links a.next, #content .paging-navigation a.next, #content .pagination a.next");
			if (!nextLink?.href) {
				this.hasNextPage = false;
				const sentinel = document.querySelector("#content > .fwe-infinite-sentinel");
				if (sentinel) {
					sentinel.innerHTML = "";
					sentinel.append(element("div", "fwe-infinite-end", "All repacks loaded"));
				}
				return;
			}
			this.loadingNextPage = true;
			const sentinel = document.querySelector("#content > .fwe-infinite-sentinel");
			if (sentinel) {
				sentinel.innerHTML = "";
				const loader = element("div", "fwe-infinite-loader");
				loader.append(element("span", "fwe-infinite-loader__spinner"), document.createTextNode("Loading more repacks..."));
				sentinel.append(loader);
			}
			try {
				const response = await fetch(nextLink.href, { credentials: "same-origin" });
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const htmlText = await response.text();
				const doc = new DOMParser().parseFromString(htmlText, "text/html");
				const newArticles = [...doc.querySelectorAll("#content article.hentry, article.hentry")];
				const existingIds = new Set([...document.querySelectorAll("article.hentry")].map((a) => a.id).filter(Boolean));
				const incomingArticles = newArticles.filter((a) => !a.id || !existingIds.has(a.id));
				const content = document.querySelector("#content");
				if (content && incomingArticles.length > 0) {
					const frag = document.createDocumentFragment();
					for (const art of incomingArticles) if (!art.matches(".fwe-upcoming, .category-upcoming, .fwe-directory-popular, .fwe-directory-az, .fwe-directory-updates")) frag.append(art);
					if (sentinel) content.insertBefore(frag, sentinel);
					else content.append(frag);
				}
				const newNav = doc.querySelector("#content > .navigation, #content > .paging-navigation");
				const currentNav = document.querySelector("#content > .navigation, #content > .paging-navigation");
				if (newNav && currentNav) currentNav.innerHTML = newNav.innerHTML;
				else if (!doc.querySelector("#content .nav-links a.next")) this.hasNextPage = false;
				if (sentinel) sentinel.innerHTML = "";
			} catch {
				if (sentinel) {
					sentinel.innerHTML = "";
					const retryBtn = element("button", "fwe-infinite-loader", "Retry loading more");
					retryBtn.style.cursor = "pointer";
					retryBtn.addEventListener("click", () => void this.loadNextPage());
					sentinel.append(retryBtn);
				}
			} finally {
				this.loadingNextPage = false;
				if (this.observerTimer !== null) {
					window.clearTimeout(this.observerTimer);
					this.observerTimer = null;
				}
				this.processArticles();
			}
		}
	};
	function syncPreloadState() {
		if (window.top !== window.self) return;
		try {
			const fastMode = getFastStoredLayoutMode();
			document.documentElement.dataset.fweMode = fastMode;
		} catch {
			document.documentElement.dataset.fweMode = "enhanced";
		}
	}
	syncPreloadState();
	async function boot() {
		if (window.top !== window.self || document.documentElement.hasAttribute("data-fwe-booted")) return;
		document.documentElement.setAttribute("data-fwe-booted", "true");
		try {
			await new FitGirlEnhancedApp().start();
		} catch (error) {
			console.error("[FitGirl Web Enhanced] 初始化失败", error);
			document.documentElement.dataset.fweMode = "original";
		}
	}
	if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => void boot(), { once: true });
	else boot();
})();
