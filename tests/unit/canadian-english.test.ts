import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { canadianize } from '#@/locales/en-ca.ts'
import { locales } from '#@/locales/locales.ts'

function swap(text: string) {
  return canadianize({ text }).text
}

await describe('English (Canada)', async () => {
  await it('uses Canadian spelling', () => {
    assert.equal(swap('Favorites'), 'Favourites')
    assert.equal(swap('Add to favorites'), 'Add to favourites')
    assert.equal(swap('5 games favorited'), '5 games favourited')
    assert.equal(swap('a color LCD screen showing 512 colors'), 'a colour LCD screen showing 512 colours')
    assert.equal(swap('a non-centering joystick'), 'a non-centring joystick')
    assert.equal(swap('an analog nub'), 'an analogue nub')
  })

  await it('keeps names, placeholders, markup and quoted words', () => {
    assert.equal(swap('The Game Boy Color and WonderSwan Color'), 'The Game Boy Color and WonderSwan Color')
    assert.equal(swap('the MIT License'), 'the MIT License')
    assert.equal(swap('{{favorite}} <favorite></favorite>'), '{{favorite}} <favorite></favorite>')
    assert.equal(swap('the spelling of "color" remained'), 'the spelling of "color" remained')
  })

  await it('has every key the English text has', () => {
    const english = locales.find(({ code }) => code === 'en')?.translation ?? {}
    const canadian = locales.find(({ code }) => code === 'en-CA')?.translation ?? {}
    assert.deepEqual(Object.keys(canadian), Object.keys(english))
  })
})
