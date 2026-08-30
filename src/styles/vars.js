module.exports = {
  bg: '#efe3ff',
  panel: '#ffffff',
  ink: '#2b2b2b',
  accent: '#4d7cff',
  // matches constants.ts's CANVAS_BG - duplicated by hand rather than
  // shared at build time (CSS vars here are a separate build-time system
  // from the TS runtime constants) so thumbnail canvases (.thumb,
  // .album-item canvas) can sit on the same purple the real canvas uses,
  // where the shared white outline (also white on the real canvas) is
  // actually visible, instead of on the panel's own white and vanishing
  canvasBg: '#9b7fe8',
  // only #c uses this directly (#tray has its own flat 400px max-width -
  // tying it to this too was tried and reverted, since a short-but-wide
  // viewport would then force tray to shrink in lockstep with the
  // vertically-driven canvas even though tray had plenty of horizontal
  // room, wrapping into far more rows than the viewport actually needed).
  // The 320px budget is everything else in #app's column measured at its
  // actual rendered height (header/request/print row/toolbar/colors/
  // effects/tray) - it's crept up over time as rows were added, so this
  // needs rechecking if the column ever grows another row; a stale
  // (too-small) budget is exactly what let #app overflow a short
  // viewport instead of shrinking to fit it.
  canvasSize: 'min(400px, 90vw, calc(100vh - 320px))',
}
