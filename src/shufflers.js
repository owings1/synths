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

const {ceil, floor, random} = Math

const Conf = {
    SOFA: {
        fill: {
            chance: 0.35,
            chances: [
                [0.05, randomElement],
                [0.15, rest],
                [0.40, arr => arr[floor(arr.length / 3)]],
                [0.45, arr => arr[ceil(arr.length / 3)]],
                [0.50, arr => arr[floor(arr.length / 2)]],
                [0.55, arr => arr[ceil(arr.length / 2)]],
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
                [0.04, randomElement],
                [0.05, rest],
                [0.10, first],
                [0.45, arr => arr[3]],
                [0.50, arr => arr[4]],
            ],
        },
        start: {
            chances: [
                [0.55, first],
            ],
        },
        smooth: 3,
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
    shuffle(arr)
    chanceFills(arr, conf.fill.chances, conf.fill.chance)
    chanceFill(arr, 0, conf.start.chances)
}


/**
 * @param {TonalSample} arr
 * @param {object} state
 */
export function BIMOM(arr, state) {
    const conf = Conf.BIMOM
    shuffle(arr, {start: 0, end: 3})
    midShuffle(arr)
    shuffle(arr, {start: arr.length - 4})
    chanceFills(arr, conf.fill.chances, conf.fill.chance)
    chanceFill(arr, 0, conf.start.chances)
    chanceFill(arr, arr.length - 1, conf.end.chances)
}


/**
 * @param {TonalSample} arr
 * @param {object} state
 */
export function TONAK(arr, state) {
    const conf = Conf.TONAK
    shuffle(arr)
    chanceFills(arr, conf.fill.chances, conf.fill.chance)
    for (let i = 0; i < conf.smooth; ++i) {
        smooth(arr)
    }
    avoidOctavesWithSwapAhead(arr)
    chanceFill(arr, 0, conf.start.chances)
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
    // Shuffle 25% of the upper half of the notes
    const start = floor(arr.length / 2)
    const limit = Math.max(3, floor(arr.length / 4))
    shuffle(arr, {limit, start})
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
 * @param {any[]} arr
 * @param {number} i
 * @param {any[][]} chances
 */

function chanceFill(arr, i, chances) {
    for (const [p, f] of chances) {
        if (p > random()) {
            arr[i] = f(arr) || arr[i]
            break
        }
    }
}

/**
 * @param {TonalSample} arr
 */
function smooth(arr) {
    if (arr.length < 3) {
        return
    }
    for (let i = 1; i < arr.length - 1; ++i) {
        let prev = arr[i - 1]
        let curr = arr[i]
        let next = arr[i + 1]
        if (!prev.index || !curr.index || !next || !next.index) {
            continue
        }
        if (prev.index < curr.index && curr.index < next.index || prev.index > curr.index && curr.index > next.index || curr.index === next.index) {
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
        if (a.type === Note && b && b.type === Note) {
            if (a.degree === b.degree && a.octave !== b.octave) {
                const c = arr[i + 2]
                if (c && c.type === Note) {
                    arr[i + 1] = c
                    arr[i + 2] = b
                }
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