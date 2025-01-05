/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */

export const Clef = {
    SUBBASS: 'subbass',
    BASS: 'bass',
    ALTO: 'alto',
    TREBLE: 'treble',
}

const CLEF_CENTERS = new Map(Object.entries({
    // F/3
    SUBBASS: 35,
    // D/3
    BASS: 38,
    // C/4
    ALTO: 48,
    // Bb/4
    TREBLE: 59,
}).map(([name, value]) => [Clef[name], value]))

const AUTO_CLEFS = [Clef.TREBLE, Clef.BASS, Clef.ALTO, Clef.SUBBASS]
const DEFAULT_CLEF = Clef.TREBLE
const BETTER_FIT_THRESHOLD = 0.6

/**
 * Guess the clef based on the notes
 * @param {Array<object|number>} notes Note objects or absolute indexes
 * @param {object} opts
 * @param {string} opts.defaultClef
 * @param {string[]} opts.clefs
 * @return {string}
 */
export function guessClef(notes, opts = undefined) {
    opts = opts || {}
    const defaultClef = opts.defaultClef || DEFAULT_CLEF
    const clefs = opts.clefs || AUTO_CLEFS
    // normalize to integer index
    notes = notes.map(note => note?.index || note).filter(Number.isInteger)
    const maxDiffs = Object.create(null)
    const fitCounts = Object.create(null)
    for (const clef of clefs) {
        const center = CLEF_CENTERS.get(clef)
        maxDiffs[clef] = -Infinity
        fitCounts[clef] = 0
        for (const note of notes) {
            const diff = Math.abs(center - note)
            if (diff > maxDiffs[clef]) {
                maxDiffs[clef] = diff
            }
            if (note >= center - 9 && note <= center + 9) {
                fitCounts[clef] += 1
            }
        }
    }
    let bestByMax = defaultClef
    let bestByFit = defaultClef
    for (const clef of clefs) {
        if (maxDiffs[clef] < maxDiffs[bestByMax]) {
            bestByMax = clef
        }
        if (fitCounts[clef] > fitCounts[bestByFit]) {
            bestByFit = clef
        }
    }
    if (bestByFit !== bestByMax && fitCounts[bestByFit] / notes.length >= BETTER_FIT_THRESHOLD) {
        return bestByFit
    }
    return bestByMax
}

const TIMESIG_GUESS_4 = Uint8Array.from([4, 2, 3, 5, 7])
const TIMESIG_GUESS_8 = Uint8Array.from([6, 3, 7])

/**
 * Try to guess a reasonable time signature
 * @param {number} numNotes total number of equal valued notes
 * @param {number} noteDur duration each note, 1, 2, 4, 8, etc.
 * @param {object} opts
 * @param {boolean} opts.prefer8
 * @return {object}
 */
export function guessTimeSig(numNotes, noteDur, opts = undefined) {
    opts = opts || {}
    let invalid = false
    let lower = 4
    let totalBeats = numNotes / noteDur * lower
    let upper
    for (const b of TIMESIG_GUESS_4) {
        if (totalBeats % b === 0) {
            upper = b
            break
        }
    }
    if (upper === undefined) {
        if (Number.isInteger(totalBeats)) {
            // just make one big measure
            upper = 1
        } else {
            // does not divide evenly by even one beat
            upper = 4
            invalid = true
        }
    }
    const try8 = noteDur % 8 === 0 && (
        invalid ||
        opts.prefer8 && upper !== 4
    )
    if (try8) {
        // Try over 8
        lower = 8
        totalBeats = numNotes / noteDur * lower
        for (const b of TIMESIG_GUESS_8) {
            if (totalBeats % b === 0) {
                upper = b
                invalid = false
                break
            }
        }
    }
    if (invalid) {
        upper = lower = 4
    }
    return {
        upper,
        lower,
        invalid,
        label: `${upper}/${lower}`
    }
}

export class Marker {
    copy() { return new this.constructor() }
    get type() { return this.constructor }
    equals(other) { return this === other || other instanceof this.constructor}
}
export class RestMarker extends Marker {}
Marker.Rest = RestMarker
