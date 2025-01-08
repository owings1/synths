/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */

import {Note} from './music.js'
import {Sample} from './sampler.js'
export const NONE = () => {}
const {random} = Math

/**
 * @param {Sample} sample
 */
export function TURNT(sample) {
    for (const note of sample) {
        if (note instanceof Note) {
            note.velocity = random()
        }
    }
}

/**
 * @param {Sample} sample
 */
export function DAWN(sample) {
    const {timeSig, noteDur} = sample
    if (!timeSig || timeSig.invalid){
        return
    }
    let velocity = 1
    sample.forEach((note, i) => {
        switch (sample.beatLabelAt(i)) {
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
