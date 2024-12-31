/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */

import {shuffle} from './utils/shuffler.js'
import {Note} from './music.js'
import {RestMarker} from './utils/notation.js'
export const NONE = () => {}
export const RANDY = shuffle
const OCTAVE = 12
const M6 = 9
const m7 = 10
const M7 = 11

const {abs, ceil, floor, random} = Math

const Conf = {
    SOFA: {
        fill: {
            chance: 0.40,
            chances: [
                // [0.05, randomElement],
                [0.30, arr => arr[4]],
                [0.40, rest],
                // [0.45, arr => arr[ceil(arr.length / 3)]],
                // [0.50, arr => arr[5]],
                [0.60, (arr, i) => arr[i - 1]],
                // [0.55, arr => arr[ceil(arr.length / 2)]],
                // [0.40, arr => arr[floor(arr.length / 3)]],
                // [0.45, arr => arr[ceil(arr.length / 3)]],
                // [0.50, arr => arr[floor(arr.length / 2)]],
                // [0.55, arr => arr[ceil(arr.length / 2)]],
            ],
        },
        start: {
            chances: [
                [0.5, first],
            ],
        },
    },
    BIMOM: {
        fill: {
            chance: 0.15,
            chances: [
                [0.10, first],
                [0.20, arr => arr[ceil(arr.length / 2)]],
                [1.00, rest],
            ],
        },
        start: {
            chances: [
                [0.25, first],
            ],
        },
        end: {
            chances: [
                [0.10, arr => arr[1]],
                [0.25, last],
            ]
        },
    },
    TONAK: {
        fill: {
            chance: 0.20,
            chances: [
                // [0.04, randomElement],
                // [0.05, first],
                [0.20, rest],
                [0.45, arr => arr[3]],
                [0.50, arr => arr[4]],
            ],
        },
        start: {
            chances: [
                [0.55, first],
            ],
        },
    },
    JARD: {
        fill: {
            chance: 0.15,
            chances: [
                [0.15, randomElement],
                [0.30, arr => arr[floor(arr.length / 2)]],
                [0.31, arr => arr[ceil(arr.length / 2)]],
                [1.00, rest],
            ],
        },
    },
    CHUNE: {
        delegate: {
            default: SOFA,
            moduli: [
                [21, BIMOM],
                [8, JARD],
                [5, TONAK],
            ],
        },
        rephrase: {
            modulo: 3,
            head: 2,
            tail: 3,
            minPrevLength: 8,
        }
    }
}

/**
 * @param {TonalSample} arr
 * @param {object} state
 */
export function SOFA(arr, state) {
    const conf = Conf.SOFA
    const starter = chanceFill(arr, 0, conf.start.chances)
    shuffle(arr)
    smooth(arr)
    smooth(arr)
    chanceFills(arr, conf.fill.chances, conf.fill.chance)
    arr[0] = starter
    smooth(arr)
    replaceLargeIntervals(arr, M6, (arr, i) => random() > 0.2 ? arr[i - 1] : rest())
}


/**
 * @param {TonalSample} arr
 * @param {object} state
 */
export function BIMOM(arr, state) {
    const conf = Conf.BIMOM
    const starter = chanceFill(arr, 0, conf.start.chances)
    const ender = chanceFill(arr, arr.length - 1, conf.end.chances)
    shuffle(arr, {start: 0, end: 3})
    midShuffle(arr)
    shuffle(arr, {start: arr.length - 4})
    chanceFills(arr, conf.fill.chances, conf.fill.chance)
    arr[0] = starter
    arr[arr.length - 1] = ender
}


/**
 * @param {TonalSample} arr
 * @param {object} state
 */
export function TONAK(arr, state) {
    const conf = Conf.TONAK
    const starter = chanceFill(arr, 0, conf.start.chances)
    shuffleByOctave(arr)
    chanceFills(arr, conf.fill.chances, conf.fill.chance)
    // smooth(arr)
    smooth(arr)
    if (random() > 0.5) {
        smooth(arr)
    }
    avoidOctavesWithSwapAhead(arr)
    smooth(arr)
    replaceConsecutiveLargeIntervals(arr)
    arr[0] = starter
    smooth(arr)
    replaceLargeIntervals(arr)
}


/**
 * @param {TonalSample} arr
 * @param {object} state
 */
export function JARD(arr, state) {
    const conf = Conf.JARD
    // Shuffle the 2nd-5th notes
    shuffle(arr, {start: 1, end: 4})
    chanceFills(arr, conf.fill.chances, conf.fill.chance)
    // Shuffle 25% of the upper half of the notes, or the notes after the first
    // 24 notes, whichever is larger.
    shuffle(arr, {
        start: Math.min(floor(arr.length / 2), 23),
        limit: Math.max(3, floor(arr.length / 4)),
    })
    if (arr.length >= 24) {
        let holdNote
        for (let i = 1; i <= 3; ++i) {
            const note = arr[arr.length - i]
            if (
                note.isLeadingTone
                //|| note.isDominant
            ) {
                holdNote = note
                break
            }
        }
        if (holdNote) {
            // Hold the last note for phrasing.
            arr[arr.length - 3] = holdNote
            arr[arr.length - 2] = holdNote
            arr[arr.length - 1] = holdNote
        }
    }
}


/**
 * @param {TonalSample} arr
 * @param {object} state
 */
export function CHUNE(arr, state) {
    const conf = Conf.CHUNE
    const {counter, prev} = state
    let delegate = conf.delegate.default
    let isRephrase = false
    search:
    if (counter > 0) {
        for (const [m, d] of conf.delegate.moduli) {
            if (counter % m === 0) {
                delegate = d
                break search
            }
        }
        isRephrase = (
            counter % conf.rephrase.modulo === 0 &&
            prev && prev.length >= conf.rephrase.minPrevLength &&
            !notesEqual(at(prev, -2), at(prev, -1))
        )
    }
    if (isRephrase) {
        rephrase(arr, prev, conf.rephrase.head, conf.rephrase.tail)
    } else {
        delegate(arr, state)
    }
}

/**
 * Return true for both null, else call note.equals
 * @param {Note|RestMarker} a
 * @param {Note|RestMarker} b
 * @return {boolean}
 */
function notesEqual(a, b) {
    return a === b || a && a.equals(b)
}


/**
 * @param {any[]} arr
 */
function midShuffle(arr) {
    const mid = Math.floor(arr.length / 2)
    const quarter = Math.floor(mid / 2)
    shuffle(arr, {start: mid - quarter, end: mid + quarter})
}

/**
 * @param {TonalSample} arr
 */
function shuffleByOctave(arr) {
    for (let i = 0, lo = 0, value; i < arr.length; ++i) {
        if (!isNote(arr[i])) {
            continue
        }
        if (value === undefined) {
            value = arr[i].index
            lo = i
            continue
        }
        if (abs(arr[i].index - value) > OCTAVE || i === arr.length - 1) {
            shuffle(arr, {start: lo, end: i-1})
            value = arr[i].index
            lo = i
        }
    }
}

/**
 * @param {any[]} arr
 * @param {any[]} orig
 * @param {number} head
 * @param {number} tail
 */
function rephrase(arr, orig, head = 2, tail = undefined) {
    if (tail === undefined) {
        tail = head
    }
    for (let i = 0; i < arr.length && i < orig.length; i++) {
        arr[i] = orig[i]
    }
    shuffle(arr, {start: 0, end: head})
    shuffle(arr, {start: arr.length - tail - 1})
}

/**
 * @param {any[]} arr
 * @param {any[][]} chances
 * @param {number} p
 */

function chanceFills(arr, chances, p = 1) {
    for (let i = 0; i < arr.length; ++i) {
        if (p < 1 && p < random()) {
            continue
        }
        chanceFill(arr, i, chances)
    }
}

/**
 * @param {T[]} arr
 * @param {number} i
 * @param {any[][]} chances
 * @return {T}
 */

function chanceFill(arr, i, chances) {
    for (const [p, f] of chances) {
        if (p > random()) {
            arr[i] = f(arr, i) || arr[i]
            break
        }
    }
    return arr[i]
}

/**
 * @param {TonalSample} arr
 */
function smooth(arr) {
    if (arr.length < 3) {
        return
    }
    for (let i = 1; i < arr.length - 1; ++i) {
        const prev = arr[i - 1]
        const curr = arr[i]
        const next = arr[i + 1]
        if (!isNote(prev, curr, next)) {
            continue
        }
        if (
            prev.index < curr.index && curr.index < next.index ||
            prev.index > curr.index && curr.index > next.index ||
            curr.index === next.index
        ) {
            continue
        }
        arr[i + 1] = curr
        arr[i] = next
    }
}

/**
 * @param {TonalSample} arr
 */
function avoidOctavesWithSwapAhead(arr) {
    for (let i = 0; i < arr.length; ++i) {
        const a = arr[i]
        const b = arr[i + 1]
        if (isNote(a, b)) {
            if (a.degree === b.degree && a.octave !== b.octave) {
                const c = arr[i + 2]
                if (isNote(c)) {
                    arr[i + 1] = c
                    arr[i + 2] = b
                }
            }
        }
    }
}

function replaceLargeIntervals(arr, limit = M7, f = rest) {
    for (let i = 0; i < arr.length - 1; ++i) {
        const a = arr[i]
        const b = arr[i + 1]
        if (isNote(a, b)) {
            if (abs(a.index - b.index) > limit) {
                arr[i + 1] = f(arr, i + 1) || b
            }
        }
    }
}

function replaceConsecutiveLargeIntervals(arr, limit = m7, f = rest) {
    if (arr.length < 3) {
        return
    }
    for (let i = 1; i < arr.length - 1; ++i) {
        const prev = arr[i - 1]
        const curr = arr[i]
        const next = arr[i + 1]

        if (isNote(prev, curr, next)) {
            if (
                abs(prev.index - curr.index) > limit &&
                abs(curr.index - next.index) > limit
            ) {
                arr[i] = f(arr, i) || arr[i]
            }
        }
    }
}
/**
 * @param {T[]} arr
 * @return {T|undefined}
 */
function randomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)]
}

function isNote(...args) {
    for (let i = 0; i < args.length; ++i) {
        if (!args[i] || args[i].type !== Note) {
            return false
        }
    }
    return true
}
/**
 * @param {T[]} arr
 * @return {T|undefined}
 */
function at(arr, i) {
    if (i < 0) {
        i = arr.length + i
    }
    return arr[i]
}

/**
 * @param {T[]} arr
 * @return {T|undefined}
 */
function first(arr) {
    return arr[0]
}

/**
 * @param {T[]} arr
 * @return {T|undefined}
 */
function last(arr) {
    return arr[arr.length - 1]
}

/**
 * @return {RestMarker}
 */
function rest() {
    return new RestMarker
}

// function halfShuffle(arr) {
//     shuffle(arr, {limit: Math.floor(arr.length / 2)})
// }