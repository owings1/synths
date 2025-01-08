
/**
 * Dotting robots.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
// import {Marker} from './utils/notation.js'
import {Note} from './music.js'
import {Sample} from './sampler.js'

const M6 = 8
export const NONE = () => {}

export const CRIM = (sample) => {

    eachMeasureStart(sample, i => {
        tryDot(sample, i)
    })
}

export const DROF = (sample) => {
    eachMeasureStart(sample, i => {
        const p = Math.random()
        if (p < 0.15) {
            let d1 = getDiffAt(sample, i)
            let d2 = getDiffAt(sample, i + 1)
            if (d1 < M6 && d2 < M6 && d1 !== 0 && d2 !== 0) {
                tryDot(sample, i)
            }
        } else if (p < 0.1) {
            let d1 = getDiffAt(sample, i + 2)
            let d2 = getDiffAt(sample, i + 3)
            if (d1 < M6 && d2 < M6 && d1 !== 0 && d2 !== 0) {
                tryDot(sample, i + 2)
            }
        }
    })
}

export default {
    NONE,
    CRIM,
    DROF,
}

function getDiffAt(sample, i, dflt = Infinity) {
    const a = sample[i]
    const b = sample[i+1]
    if (bothAreNotes(a, b)) {
        return Math.abs(a.index - b.index)
    }
    return dflt
}

function dotAt(sample, i) {
    const a = sample[i]
    const b = sample[i+1]
    a.dot = b.dedot = true
    b.dot = a.dedot = false
    a.articulation = 0.5
    b.articulation = 0.2
}

/**
 * 
 * @param {Sample} sample 
 * @param {number} i 
 * @returns {boolean}
 */
function canDot(sample, i) {
    const {notesPerMeasure} = sample
    if (notesPerMeasure < 2 || i % notesPerMeasure >= notesPerMeasure - 1) {
        return false
    }
    const a = sample[i]
    const b = sample[i + 1]
    const c = sample[i - 1]
    return (
        bothAreNotes(a, b) &&
        !a.dot && !a.dedot &&
        !b.dot && !b.dedot && (
            !c || !c.dot && !c.dedot
        )
    )

}

function bothAreNotes(a, b) {
    return Boolean(a && b) && a.type === Note && a.type === b.type
}

/**
 * 
 * @param {Sample} sample 
 * @param {number} i 
 * @returns {boolean}
 */
function tryDot(sample, i) {
    if (canDot(sample, i)) {
        dotAt(sample, i)
        return true
    }
    return false
}

/**
 * 
 * @param {Sample} sample 
 * @param {function} cb 
 */
function eachMeasureStart(sample, cb) {
    const {notesPerMeasure} = sample
    for (let i = 0, m = 0; i < sample.length; i += notesPerMeasure, m += 1) {
        cb(i, m)
    }
}
