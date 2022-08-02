
// import {Marker} from './utils/notation.js'
import {Note} from './music.js'

export const NONE = () => {}

export const CRIM = (sample, state) => {

    eachMeasureStart(sample, state, i => {
        tryDot(sample, state, i)
    })
}

export const DROF = (sample, state) => {
    eachMeasureStart(sample, state, i => {
        const p = Math.random()
        if (p > 0.25) {
            tryDot(sample, state, i)
        } else if (p > 0.1) {
            tryDot(sample, state, i + 2)
        }
    })
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
        sample[i].dot = true
        sample[i + 1].dedot = true
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