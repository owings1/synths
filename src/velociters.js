/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */

import {Note, TonalSample} from './music.js'
import {State} from './sampler.js'
export const NONE = () => {}
const {random} = Math

/**
 * @param {TonalSample} sample
 * @param {State} state
 */
export function TURNT(sample, state) {
    for (const note of sample) {
        if (note instanceof Note) {
            note.velocity = random()
        }
    }
}

/**
 * @param {TonalSample} sample
 * @param {State} state
 */
export function DAWN(sample, state) {
    const {timeSig, beat} = state
    if (!timeSig || timeSig.invalid || !beat){
        return
    }
    const noteDur = 240 / beat
    let velocity = 1
    sample.forEach((note, i) => {
        if (!(note instanceof Note)) {
            return
        }
        switch (classify(timeSig, noteDur, i)) {
            case 'downbeat':
            case 'midbeat':
                velocity = 1
                break
            case 'pickup':
                velocity = 0.9
                break
            default:
                velocity = velocity === 1 ? 0.8 : 0.7
                break
        }
        if (note instanceof Note) {
            note.velocity = velocity
        }
    })

}

export default {
    NONE,
    TURNT,
    DAWN,
}

function classify(timeSig, noteDur, i) {
    const {upper, lower} = timeSig
    const measureLength = upper / (lower / noteDur)
    switch (i % measureLength) {
        case 0:
            return 'downbeat'
        case measureLength / 2 - 1:
            return 'midbeat'
        case measureLength - 1:
            return 'pickup'
        default:
            return 'other'
    }
}
