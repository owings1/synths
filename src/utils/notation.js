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

const CLEF_CENTERS = Object.fromEntries(Object.entries({
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

/**
 * Guess the clef based on the notes
 * @param {Note[]|number[]} notes Note objects or absolute indexes
 * @param {string} defaultClef
 * @param {string[]} autoClefs
 * @return {string}
 */
export function guessClef(notes, defaultClef = undefined, autoClefs = undefined) {
    autoClefs = autoClefs || AUTO_CLEFS
    notes = notes.filter(note => note != null) // allow 0
    const maxes = Object.create(null)
    for (const clef of autoClefs) {
        maxes[clef] = -Infinity
        notes.forEach(note => {
            const diff = Math.abs(CLEF_CENTERS[clef] - (note.index || note))
            if (diff > maxes[clef]) {
                maxes[clef] = diff
            }
        })
    }
    let best = defaultClef || DEFAULT_CLEF
    for (const clef in maxes) {
        if (maxes[clef] < maxes[best]) {
            best = clef
        }
    }
    return best
}

const TIMESIG_GUESS_4 = [4, 2, 3, 5, 7, 1]
const TIMESIG_GUESS_8 = [6, 3, 7]

/**
 * Try to guess a reasonable time signature
 * @param {number} numNotes total number of equal valued notes
 * @param {number} noteDur duration each note, 1, 2, 4, 8, etc.
 * @return {object}
 */
export function guessTimeSig(numNotes, noteDur) {
    let invalid = false
    let lower = 4
    let totalBeats = numNotes / noteDur * lower
    let upper
    search:
    for (const b of TIMESIG_GUESS_4) {
        switch (b) {
            case 4: // prefer 4/4
            case 2: // go for 2/2 if even number of total beats
            case 3: // use 3/4 
            case 5: // try 5/4 for fun
            case 7: // why not 7/4
                if (totalBeats % b === 0) {
                    upper = b
                    break search
                }
                break
            case 1:
                if (totalBeats % b === 0) { // just make one big measure
                    upper = totalBeats
                    break search
                }
            default: // does not divide evenly by even one beat
                upper = 4
                invalid = true
        }
    }
    if (invalid) {
        if (noteDur % 8 === 0) {
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
    }
    if (invalid) {
        upper = lower = 4
    }
    return {
        upper,
        lower,
        totalBeats,
        invalid,
        label: `${upper}/${lower}`
    }
}
