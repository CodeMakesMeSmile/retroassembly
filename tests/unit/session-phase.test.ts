import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getSessionPhase } from '#@/emulator/session.ts'

await describe('game session phase', async () => {
  await it('is preparing while the game downloads, and ready once it has', () => {
    assert.equal(getSessionPhase({ exiting: false, launched: false, preparing: true }), 'preparing')
    assert.equal(getSessionPhase({ exiting: false, launched: false, preparing: false }), 'ready')
  })

  await it('is running once launched, and exiting while it shuts down, whatever else is going on', () => {
    assert.equal(getSessionPhase({ exiting: false, launched: true, preparing: true }), 'running')
    assert.equal(getSessionPhase({ exiting: true, launched: true, preparing: false }), 'exiting')
    assert.equal(getSessionPhase({ exiting: true, launched: false, preparing: true }), 'exiting')
  })
})
