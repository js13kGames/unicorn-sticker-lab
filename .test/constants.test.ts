import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../src/constants'

test('canvas dimensions are positive', () => {
  expect(CANVAS_WIDTH).toBeGreaterThan(0)
  expect(CANVAS_HEIGHT).toBeGreaterThan(0)
})
