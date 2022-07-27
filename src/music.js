/**
 * Western 12-tone music module.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {closest, ValueError} from './utils.js'

/** Tonality Enum */
export const Tonality = {
    MAJOR: 1,
    NATURAL_MINOR: 2,
    HARMONIC_MINOR: 3,
    MELODIC_MINOR: 4,
    DORIAN: 5,
    PHRYGIAN: 6,
    LYDIAN: 7,
    MIXOLYDIAN: 8,
    LOCRIAN: 9,
    DIMINISHED: 10,
    AUGMENTED: 11,
    WHOLE_TONE: 12,
    PROMETHEUS: 13,
    BLUES: 14,
    TRITONE: 15,
    MAJOR_PENTATONIC: 16,
    MINOR_PENTATONIC: 17,
    JAPANESE: 18,
}

/** Direction Enum */
export const Dir = {
    ASCEND: 1,
    DESCEND: 2,
    ASCEND_DESCEND: 7,
    DESCEND_ASCEND: 15,
}
Object.defineProperties(Dir, {
    isMulti: {
        value: dir => Boolean(dir & 4),
        writable: false,
        enumerable: false,
    }
})
export const MULTIDIR_FLAG = 4

/**
 * Adjust a frequency by a number of half-steps
 * 
 * @param {Number} freq The base frequency. Performs internal floor rounding
 *   to get a valid value. If a valid value is not found, and `strict` is not
 *   specified, the closest frequency is used.
 * @param {Number} degrees The number of half-steps (+/-)
 * @param {Boolean} strict Do not adjust base to closest known frequency
 * @return {Number|undefined} The frequency, or undefined if out of range
 */
 export function stepFreq(freq, degrees, strict = false) {
    let baseData = getFreqData(freq, strict)
    if (baseData) {
        return FREQS[baseData.freqIndex + Number(degrees)]
    }
}

/**
 * Build a scale array from high-level options
 * 
 * @param {Number} degree The tonic degree (0-11)
 * @param {object} opts The options
 * @param {Number} opts.octave The octave (0-8)
 * @param {Number} opts.tonality Tonality indicator (1-18)
 * @param {Number} opts.direction Directionality indicator (1, 3, 7, 11)
 * @param {Number} opts.octaves Number of octaves
 * @param {Boolean} opts.strict Fail for unknown tonic frequency
 * @param {Boolean} opts.clip Clip out of bounds frequencies
 * @return {Number[]} Array of note frequencies
 */
export function scaleSample(degree, opts = undefined) {
    opts = opts ? {...opts} : {}
    let {octave, direction} = opts
    const tonic = freqAtDegree(degree, octave)
    let freqs
    direction = Number(direction)
    if (Dir.isMulti(direction)) {
    // if (direction & MULTIDIR_FLAG) {
        opts.descend = direction === Dir.DESCEND_ASCEND
        freqs = scaleFreqs(tonic, opts)
        opts.descend = !opts.descend
        scaleFreqs(freqs.pop(), opts).forEach(freq => freqs.push(freq))
    } else {
        opts.descend = direction === Dir.DESCEND
        freqs = scaleFreqs(tonic, opts)
    }
    return freqs
}

function scaleDegrees(tonality, descend) {
    const base = SCALE_INTERVALS[tonality]
    if (!base) {
        throw new ValueError(`Invalid tonality: ${tonality}`)
    }
    const intervals = base[descend ? 1 : 0]
    const dir = descend ? -1 : 1
    let degree = descend ? 12 : 0
    const degrees = [degree]
    intervals.forEach(ival => {
        degree += ival * dir
        degrees.push(degree)
    })
    return degrees
}

/**
 * Return a unidirectional scale starting from a frequency
 * 
 * @param {Number} tonic Start frequency
 * @param {object} opts The options
 * @param {Number} opts.tonality
 * @param {Boolean} opts.descend
 * @param {Number} opts.octaves
 * @param {Boolean} opts.strict
 * @param {Boolean} opts.clip
 * @return {Number[]}
 */
function scaleFreqs(tonic, opts) {
    let tonicData = getFreqData(tonic, opts.strict)
    if (!tonicData) {
        throw new ValueError(`Invalid frequency: ${tonic}`)
    }
    tonic = tonicData.freq
    let {tonality, descend, octaves} = opts
    if (tonality === undefined) {
        tonality = Tonality.MAJOR
    }
    const base = SCALE_INTERVALS[tonality]
    if (!base) {
        throw new ValueError(`Invalid tonality: ${tonality}`)
    }
    octaves = octaves === undefined ? 1 : Number(octaves)
    if (octaves < 1) {
        throw new ValueError(`Invalid octaves: ${octaves}`)
    }
    descend = Boolean(descend)
    const olimit = descend
        ? tonicData.octave
        : OCTAVE_COUNT - tonicData.octave - 1
    if (olimit < 1) {
        throw new ValueError(`Scale out of bounds`)
    }
    if (octaves > olimit) {
        if (!opts.clip) {
            let msg = `${octaves} exceeds max ${olimit} octaves from tonic`
            throw new ValueError(msg)
        }
        octaves = olimit
    }
    const dir = descend ? -1 : 1
    const intervals = base[Number(descend)]
    const freqs = [tonic]
    let freq = tonic
    for (let o = 0; o < octaves; ++o) {
        for (let i = 0; i < intervals.length; i++) {
            freq = stepFreq(freq, dir * intervals[i], true)
            freqs.push(freq)
        }
    }
    // freqs.length === intervals.length * octaves + 1
    return freqs
}

/**
 * Get frequency for scale degree (0-11) and octave (0-8)
 * 
 * @param {Number} degree The scale degree, 0-11
 * @param {Number} octave The octave, 0-8
 * @return {Number} The frequency
 */
function freqAtDegree(degree, octave) {
    if (octave === undefined) {
        octave = 4
    }
    const o = OCTAVES[octave]
    if (!o) {
        throw new ValueError(`Invalid octave ${octave}`)
    }
    const freq = o[degree]
    if (!freq) {
        throw new ValueError(`Invalid degree ${degree}`)
    }
    return freq
}

/**
 * Find the closest known frequency.
 * 
 * @param {Number} target The search value.
 * @return {Number} The closest known frequency.
 */
function closestFreq(target) {
    return closest(target, FREQS).value
}

/**
 * @param {Number} freq
 * @param {Boolean} strict
 * @return {object|undefined}
 */
function getFreqData(freq, strict = false) {
    let data = FREQS_DATA[getFreqId(freq)]
    if (!data && !strict) {
        data = FREQS_DATA[getFreqId(closestFreq(freq))]
    }
    return data
}

/**
 * @param {String|Number} value
 * @return {String}
 */
function getFreqId(value) {
    return String(Math.floor(Number(value)))
}

// Lock Enum objects.
;[Tonality, Dir].forEach(Enum => {
    Object.entries(Enum).forEach(([name, value]) => {
        Object.defineProperty(Enum, name, {
            value,
            enumerable: true,
            writable: false,
        })
    })
})
// Mode aliases.
Object.defineProperties(Tonality, {
    IONIAN: {
        value: Tonality.MAJOR,
        enumerable: false,
        writable: false,
    },
    AEOLIAN: {
        value: Tonality.NATURAL_MINOR,
        enumerable: false,
        writable: false,
    }
})

/**
 * Scale intervals. Value is a pair of arrays [ascending, descending].
 * The descending array is generated from the reverse of the ascending,
 * unless it is directly given here.
 */
const SCALE_INTERVALS = Object.fromEntries(Object.entries({
    MAJOR: [[2, 2, 1, 2, 2, 2, 1], null],
    NATURAL_MINOR: [[2, 1, 2, 2, 1, 2, 2], null],
    HARMONIC_MINOR: [[2, 1, 2, 2, 1, 3, 1], null],
    MELODIC_MINOR: [[2, 1, 2, 2, 2, 2, 1], [2, 2, 1, 2, 2, 1, 2]],
    DORIAN: [[2, 1, 2, 2, 2, 1, 2], null],
    PHRYGIAN: [[1, 2, 2, 2, 1, 2, 2], null],
    LYDIAN: [[2, 2, 2, 1, 2, 2, 1], null],
    MIXOLYDIAN: [[2, 2, 1, 2, 2, 1, 2], null],
    LOCRIAN: [[1, 2, 2, 1, 2, 2, 2], null],
    DIMINISHED: [[1, 2, 1, 2, 1, 2, 1, 2], null],
    WHOLE_TONE: [[2, 2, 2, 2, 2, 2], null],
    AUGMENTED: [[3, 1, 3, 1, 3, 1], null],
    PROMETHEUS: [[2, 2, 2, 3, 1, 2], null],
    BLUES: [[3, 2, 1, 1, 3, 2], null],
    TRITONE: [[1, 3, 2, 1, 3, 2], null],
    MAJOR_PENTATONIC: [[2, 2, 3, 2, 3], null],
    MINOR_PENTATONIC: [[3, 2, 2, 3, 2], null],
    JAPANESE: [[1, 4, 2, 1, 4], null],
}).map(([key, value]) => [Tonality[key], value]))

Object.values(SCALE_INTERVALS).forEach(arr => {
    if (arr[1] === null) {
        arr[1] = arr[0].slice(0).reverse()
    }
})

const OCTAVES = [
    [16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50, 29.14, 30.87],
    [32.70, 34.65, 36.71, 38.89, 41.20, 43.65, 46.25, 49.00, 51.91, 55.00, 58.27, 61.74],
    [65.41, 69.30, 73.42, 77.78, 82.41, 87.31, 92.50, 98.00, 103.83, 110.00, 116.54, 123.47],
    [130.81, 138.59, 146.83, 155.56, 164.81, 174.61, 185.00, 196.00, 207.65, 220.00, 233.08, 246.94],
    [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88],
    [523.25, 554.37, 587.33, 622.25, 659.25, 698.46, 739.99, 783.99, 830.61, 880.00, 932.33, 987.77],
    [1046.50, 1108.73, 1174.66, 1244.51, 1318.51, 1396.91, 1479.98, 1567.98, 1661.22, 1760.00, 1864.66, 1975.53],
    [2093.00, 2217.46, 2349.32, 2489.02, 2637.02, 2793.83, 2959.96, 3135.96, 3322.44, 3520.00, 3729.31, 3951.07],
    [4186.01, 4434.92, 4698.63, 4978.03, 5274.04, 5587.65, 5919.91, 6271.93, 6644.88, 7040.00, 7458.62, 7902.13],
]

/** Flat list of frequency values. */
const FREQS = new Float32Array(OCTAVES.length * 12)

/** Frequency data, keyed by frequency ID. */
const FREQS_DATA = Object.create(null)

const DEG_LETTERS = 'CCDDEFFGGAAB'

OCTAVES.forEach((freqs, octave) => {
    freqs.forEach((freq, degree) => {
        const freqIndex = octave * 12 + degree
        const freqId = getFreqId(freq)
        const letter = DEG_LETTERS[degree]
        const raised = DEG_LETTERS[degree - 1] === letter
        FREQS[freqIndex] = freq
        FREQS_DATA[freqId] = {
            freq, freqIndex, freqId, octave,
            letter, raised, degree,
        }
    })
})

/** Number of supported octaves. */
export const OCTAVE_COUNT = OCTAVES.length
/** Number of known frequencies. */
export const FREQ_COUNT = FREQS.length
/** Minimum known frequency. */
export const FREQ_MIN = FREQS[0]
/** Maximum known frequency. */
export const FREQ_MAX = FREQS[FREQS.length - 1]