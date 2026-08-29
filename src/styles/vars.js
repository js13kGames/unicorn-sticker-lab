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
  // shared by #c and #tray so they always shrink in lockstep on short
  // viewports - #tray's own max-width can never exceed the canvas's
  // rendered width this way, which keeps #stage reliably #app's widest
  // child (see the layout comments in game.css for why that matters)
  canvasSize: 'min(400px, 90vw, calc(100vh - 280px))',
}
