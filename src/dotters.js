
// import {Marker} from './utils/notation.js'
import {Note} from './music.js'

const M6 = 8
export const NONE = () => {}

export const CRIM = (sample, state) => {

    eachMeasureStart(sample, state, i => {
        tryDot(sample, state, i)
    })
}

export const DROF = (sample, state) => {
    eachMeasureStart(sample, state, i => {
        const p = Math.random()
        if (p < 0.15) {
            if (getDiffAt(sample, i + 1) < M6) {
                tryDot(sample, state, i)
            }
        } else if (p < 0.1) {
            if (getDiffAt(sample, i + 3) < M6) {
                tryDot(sample, state, i + 2)
            }
            // tryDot(sample, state, i + 2)
        }
    })
}

function getDiffAt(sample, i, dflt = Infinity) {
    const a = sample[i]
    const b = sample[i+1]
    if (a && b && a.type === Note && b.type === Note) {
        return Math.abs(a.index - b.index)
    }
    return dflt
}
function dotAt(sample, i) {
    const a = sample[i]
    const b = sample[i+1]
    a.dot = b.dedot = true
    b.dot = a.dedot = false
}

function canDot(sample, state, i) {
    const {notesPerMeasure} = state
    if (notesPerMeasure < 2 || i % notesPerMeasure >= notesPerMeasure - 1) {
        return false
    }
    const a = sample[i]
    const b = sample[i + 1]
    return (
        a && b &&
        a.type === Note && b.type === Note &&
        !a.dot && !a.dedot &&
        !b.dot && !b.dedot
    )

}
function tryDot(sample, state, i) {
    if (canDot(sample, state, i)) {
        dotAt(sample, i)
        return true
    }
    return false
}

function eachMeasureStart(sample, state, cb) {
    const {notesPerMeasure} = state
    for (let i = 0, m = 0; i < sample.length; i += notesPerMeasure, m += 1) {
        cb(i, m)
    }
}