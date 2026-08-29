module.exports = {
  bg: '#efe3ff',
  panel: '#ffffff',
  ink: '#2b2b2b',
  accent: '#4d7cff',
  // shared by #c and #tray so they always shrink in lockstep on short
  // viewports - #tray's own max-width can never exceed the canvas's
  // rendered width this way, which keeps #stage reliably #app's widest
  // child (see the layout comments in game.css for why that matters)
  canvasSize: 'min(400px, 90vw, calc(100vh - 280px))',
}
