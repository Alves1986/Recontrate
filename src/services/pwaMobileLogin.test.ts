import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  detectCurrentMobileOrPwa,
  detectStandaloneDisplayMode,
  isMobileOrPwaViewport,
  shouldRenderMobileLoginOnly,
} from '../utils/pwaMobileMode';

const ROOT_DIR = process.cwd();

test('PWA: manifest.webmanifest existe com start_url /entrar, display standalone e ícone SVG', () => {
  const manifestPath = path.join(ROOT_DIR, 'public', 'manifest.webmanifest');
  assert.equal(fs.existsSync(manifestPath), true);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.short_name, 'Confiare');
  assert.equal(manifest.start_url, '/entrar');
  assert.equal(manifest.scope, '/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#0A2540');
  assert.equal(manifest.background_color, '#F4F2EF');
  assert.equal(Array.isArray(manifest.icons) && manifest.icons.length > 0, true);
  assert.equal(manifest.icons[0].src, '/icons/icon.svg');

  const iconPath = path.join(ROOT_DIR, 'public', 'icons', 'icon.svg');
  assert.equal(fs.existsSync(iconPath), true);
});

test('PWA: Service Worker (public/sw.js) não faz cache de endpoints /api/ nem requisições não-GET', () => {
  const swPath = path.join(ROOT_DIR, 'public', 'sw.js');
  assert.equal(fs.existsSync(swPath), true);
  const swSource = fs.readFileSync(swPath, 'utf8');

  assert.match(swSource, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(swSource, /request\.method !== 'GET'/);
  assert.match(swSource, /\/entrar/);
});

test('PWA: index.html e vercel.json configuram manifest, meta tags mobile e rewrites estáticos', () => {
  const indexHtml = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  assert.match(indexHtml, /<link rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(indexHtml, /<meta name="theme-color" content="#0A2540"/);
  assert.match(indexHtml, /apple-mobile-web-app-capable/);

  const vercelConfig = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'vercel.json'), 'utf8')
  );
  const sourcePattern = vercelConfig.rewrites?.[0]?.source ?? '';
  assert.match(sourcePattern, /manifest\\\.webmanifest/);
  assert.match(sourcePattern, /sw\\\.js/);
  assert.match(sourcePattern, /icons\//);
});

test('Mobile Login-Only: mobile (<768px) ou standalone deslogado exibe apenas Login em "/" e "/entrar"', () => {
  assert.equal(isMobileOrPwaViewport(390, false), true);
  assert.equal(isMobileOrPwaViewport(1280, true), true);
  assert.equal(isMobileOrPwaViewport(1280, false), false);

  // Mobile visitante em "/" -> somente tela de Login
  assert.equal(
    shouldRenderMobileLoginOnly({
      pathname: '/',
      width: 390,
      isStandalone: false,
      isAuthenticated: false,
    }),
    true
  );

  // PWA standalone visitante em "/" ou "/entrar" -> somente Login
  assert.equal(
    shouldRenderMobileLoginOnly({
      pathname: '/entrar',
      width: 1024,
      isStandalone: true,
      isAuthenticated: false,
    }),
    true
  );

  // Mobile ainda permite /criar-conta e /recuperar-senha a partir do Login
  assert.equal(
    shouldRenderMobileLoginOnly({
      pathname: '/criar-conta',
      width: 390,
      isStandalone: false,
      isAuthenticated: false,
    }),
    false
  );
  assert.equal(
    shouldRenderMobileLoginOnly({
      pathname: '/recuperar-senha',
      width: 390,
      isStandalone: false,
      isAuthenticated: false,
    }),
    false
  );

  // Desktop Web "/" continua exibindo a landing pública normalmente
  assert.equal(
    shouldRenderMobileLoginOnly({
      pathname: '/',
      width: 1280,
      isStandalone: false,
      isAuthenticated: false,
    }),
    false
  );

  // Usuário autenticado no mobile não fica preso no Login
  assert.equal(
    shouldRenderMobileLoginOnly({
      pathname: '/',
      width: 390,
      isStandalone: true,
      isAuthenticated: true,
    }),
    false
  );
});

test('PWA helpers são seguros em SSR/Node sem window definido', () => {
  assert.equal(detectStandaloneDisplayMode(), false);
  assert.equal(detectCurrentMobileOrPwa(), false);
});
