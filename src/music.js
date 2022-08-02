/**
 * Western 12-tone music module.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {closest, ValueError} from './utils/utils.js'

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

const H = 1
const W = 2
const m3 = 3
const M3 = 4
const P4 = 5
const OCTAVE = 12
const DEG_LETTERS = 'CCDDEFFGGAAB'
const SHARP_LABEL = '#'
const FLAT_LABEL = 'b'
const MINOR_LABEL = 'm'
const OCTAVE_SEPARATOR = '/'

export function getNote(degree, octave) {
    return new Note(octave * OCTAVE + degree)
}
/**
 * Get a note at a frequency
 * @param {number} freq
 * @param {boolean} strict
 * @return {Note}
 */
export function freqNote(freq, strict = false) {
    const data = getFreqData(freq, strict)
    if (data) {
        return new Note(data.index)
    }
}

/**
 * Adjust a frequency by a number of half-steps
 * 
 * @param {number} freq The base frequency. Performs internal floor rounding
 *   to get a valid value. If a valid value is not found, and `strict` is not
 *   specified, the closest frequency is used.
 * @param {number} degrees The number of half-steps (+/-)
 * @param {boolean} strict Do not adjust base to closest known frequency
 * @return {number|undefined} The frequency, or undefined if out of range
 */
export function stepFreq(freq, degrees, strict = false) {
    let baseData = getFreqData(freq, strict)
    if (baseData) {
        return FREQS[baseData.index + Number(degrees)]
    }
}

/**
 * Build a scale array from high-level options
 * 
 * @param {number} degree The tonic degree (0-11)
 * @param {object} opts The options
 * @param {number} opts.octave The octave (0-8)
 * @param {number} opts.tonality Tonality indicator (1-18)
 * @param {number} opts.direction Directionality indicator (1, 3, 7, 11)
 * @param {number} opts.octaves Number of octaves
 * @param {boolean} opts.arpeggio Use arpeggio intervals
 * @param {boolean} opts.clip Clip out of bounds frequencies
 * @return {TonalSample} Array of scale notes
 */
export function scaleSample(degree, opts = undefined) {
    opts = opts ? {...opts} : {}
    const tonality = opts.tonality === undefined
        ? Tonality.MAJOR
        : Number(opts.tonality)
    if (!Tonality.isValid(tonality)) {
        throw new ValueError(`Invalid tonality: ${tonality}`)
    }
    degree = Number(degree)
    const octave = opts.octave === undefined ? 4 : Number(opts.octave)
    if (!Number.isInteger(octave) || octave < 0 || octave >= OCTAVE_COUNT) {
        throw new ValueError(`Invalid octave ${octave}`)
    }
    if (!Number.isInteger(degree) || degree < 0 || degree >= OCTAVE) {
        throw new ValueError(`Invalid degree ${degree}`)
    }
    const direction = Number(opts.direction)
    let notes
    if (Dir.isMulti(direction)) {
        opts.descend = direction === Dir.DESCEND_ASCEND
        notes = scaleNotes(degree, octave, tonality, opts)
        opts.descend = !opts.descend
        const leaf = notes.pop()
        notes.push(...scaleNotes(leaf.degree, leaf.octave, tonality, opts))
    } else {
        opts.descend = direction === Dir.DESCEND
        notes = scaleNotes(degree, octave, tonality, opts)
    }
    return new TonalSample().init(notes, notes[0], tonality)
}

/**
 * Return a unidirectional scale
 * @param {number} degree
 * @param {number} octave
 * @param {number} tonality
 * @param {object} opts
 * @param {boolean} opts.descend
 * @param {number} opts.octaves
 * @param {boolean} opts.arpeggio
 * @param {boolean} opts.clip
 * @return {TonalNote[]}
 */
function scaleNotes(degree, octave, tonality, opts) {
    opts = opts || {}
    const base = opts.arpeggio
        ? ARPEGGIO_INTERVALS[tonality]
        : SCALE_INTERVALS[tonality]
    const tonic = new TonalNote(octave * OCTAVE + degree, null, tonality)
    const descend = Boolean(opts.descend)
    const olimit = descend ? tonic.octave : OCTAVE_COUNT - tonic.octave - 1
    let octaves = opts.octaves === undefined ? 1 : Number(opts.octaves)
    if (octaves < 1) {
        throw new ValueError(`Invalid octaves: ${octaves}`)
    }
    if (olimit < 1) {
        throw new ValueError(`Scale out of bounds`)
    }
    if (octaves > olimit) {
        if (!opts.clip) {
            const msg = `${octaves} exceeds max ${olimit} octaves from tonic`
            throw new ValueError(msg)
        }
        octaves = olimit
    }
    const dir = descend ? -1 : 1
    const intervals = base[Number(descend)]
    const notes = [tonic]
    for (let note = tonic, o = 0; o < octaves; ++o) {
        for (let i = 0; i < intervals.length; ++i) {
            const idx = note.index + dir * intervals[i]
            note = new TonalNote(idx, tonic, tonality)
            notes.push(note)
        }
    }
    return notes
}

/**
 * Get the internal note data for a frequency
 * @param {number} freq The frequency
 * @param {boolean} strict Default is to find the closest valid value
 * @return {object|undefined}
 */
function getFreqData(freq, strict = false) {
    let data = FREQS_DATA[getFreqId(freq)]
    if (!data && !strict) {
        data = FREQS_DATA[getFreqId(closest(freq, FREQS))]
    }
    return data
}

/**
 * Get the internal ID of a frequency
 * @param {string|number} value
 * @return {string}
 */
function getFreqId(value) {
    return String(Math.floor(Number(value)))
}

/**
 * Normalize negative values and values > 11
 * @param {number} index
 * @return {number}
 */
function degreeAt(index) {
    if (index < 0) {
        return degreeAt(index + OCTAVE)
    }
    if (index >= OCTAVE) {
        return degreeAt(index - OCTAVE)
    }
    return index
}

// Lock Enum objects.
for (const Enum of [Tonality, Dir]) {
    Object.entries(Enum).forEach(([name, value]) => {
        Object.defineProperty(Enum, name, {
            value,
            enumerable: true,
            writable: false,
        })
    })
}

Object.defineProperties(Tonality, {
    // Mode aliases.
    IONIAN: {
        value: Tonality.MAJOR,
        enumerable: false,
        writable: false,
    },
    AEOLIAN: {
        value: Tonality.NATURAL_MINOR,
        enumerable: false,
        writable: false,
    },
    // reference functions
    isValid: {
        value: value => Number.isInteger(value) && 0 < value && value <= 18,
        enumerable: false,
        writable: false,
    },
    isMinor: {
        value: tonality => MAJOR_OFFSETS[tonality] === -9,
        enumerable: false,
        writable: false,
    },
})

Object.defineProperties(Dir, {
    isMulti: {
        value: dir => Boolean(dir & 4),
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
    // Normal modes
    MAJOR:          [[W, W, H, W, W, W, H], null],
    DORIAN:         [[W, H, W, W, W, H, W], null],
    PHRYGIAN:       [[H, W, W, W, H, W, W], null],
    LYDIAN:         [[W, W, W, H, W, W, H], null],
    MIXOLYDIAN:     [[W, W, H, W, W, H, W], null],
    NATURAL_MINOR:  [[W, H, W, W, H, W, W], null],
    LOCRIAN:        [[H, W, W, H, W, W, W], null],
    // Other minor
    HARMONIC_MINOR: [[W, H, W, W, H, m3, H], null],
    MELODIC_MINOR:  [[W, H, W, W, W, W, H], [W, W, H, W, W, H, W]],
    // Octatonic
    DIMINISHED:  [[H, W, H, W, H, W, H, W], null],
    // Hexatonic
    WHOLE_TONE: [[W,  W, W,  W, W,  W], null],
    AUGMENTED:  [[m3, H, m3, H, m3, H], null],
    PROMETHEUS: [[W,  W, W, m3, H,  W], null],
    BLUES:      [[m3, W, H,  H, m3, W], null],
    TRITONE:    [[H, m3, W,  H, m3, W], null],
    // Pentatonic
    MAJOR_PENTATONIC: [[W, W, m3, W, m3], null],
    MINOR_PENTATONIC: [[m3, W, W, m3, W], null],
    JAPANESE:         [[H, M3, W, H, M3], null],
}).map(([key, value]) => [Tonality[key], value]))

const ARPEGGIO_INTERVALS = Object.fromEntries(Object.entries({
    // Normal modes
    MAJOR:          [[M3, m3, P4], null],
    DORIAN:         [[m3, M3, P4], null], // TODO
    PHRYGIAN:       [[H,  M3, W,  P4], null],
    LYDIAN:         [[M3, m3, M3, H], null], // ?
    MIXOLYDIAN:     [[M3, H,  M3, m3], null], // ?
    NATURAL_MINOR:  [[m3, M3, P4], null],
    LOCRIAN:        [[m3, m3, M3, W], null], // ? this avoids a tritone, other options exist
    // Other minor
    HARMONIC_MINOR: [[m3, M3, M3, H], null], // ?
    MELODIC_MINOR:  [[m3, M3, W, m3], [P4, M3, m3]],
    // Octatonic
    DIMINISHED: [[m3, m3, m3, m3], null],
    // Hexatonic
    WHOLE_TONE: [[M3, W,  W, M3], null],
    AUGMENTED:  [[M3, M3, M3], null],
    PROMETHEUS: [[M3, P4, H,  W], null],
    BLUES:      [[m3, m3, M3, W], null],
    TRITONE:    [[M3, W,  M3, W], null],
    // Pentatonic
    MAJOR_PENTATONIC: [[M3, m3, W, m3], null],
    MINOR_PENTATONIC: [[m3, M3, m3, W], null],
    JAPANESE:         [[H, M3, m3, M3], null],
}).map(([key, value]) => [Tonality[key], value]))

for (const base of [SCALE_INTERVALS, ARPEGGIO_INTERVALS]) {
    Object.values(base).forEach(arr => {
        if (arr[1] === null) {
            arr[1] = arr[0].slice(0).reverse()
        }
    })
}

const symNote = Symbol()

/**
 * Note data container
 */
class Note {

    /**
     * @param {number} index The absolute index
     */
    constructor(index) {
        if (!Number.isInteger(index) || index < 0 || index >= NOTES_DATA.length) {
            throw new ValueError(`Invalid note index: ${index}`)
        }
        this[symNote] = NOTES_DATA[index]
    }
    /** @type {number} */
    get index() {
        return this[symNote].index
    }
    /** @type {number} */
    get freq() {
        return this[symNote].freq
    }
    /** @type {number} */
    get octave() {
        return this[symNote].octave
    }
    /** @type {number} */
    get degree() {
        return this[symNote].degree
    }
    /** @type {string} */
    get letter() {
        return this[symNote].letter
    }
    /** @type {boolean} */
    get isBlackKey() {
        return this[symNote].raised
    }
    /** @type {string} */
    get label() {
        return this.shortLabel + OCTAVE_SEPARATOR + this.octave
    }
    /** @type {string} */
    get shortLabel() {
        if (this.isBlackKey) {
            return this.letter + SHARP_LABEL
        }
        return this.letter
    }
    /** @type {string} */
    get flattedLabel() {
        return this.flattedShortLabel + OCTAVE_SEPARATOR + this.octave
    }
    /** @type {string} */
    get flattedShortLabel() {
        if (this.isBlackKey) {
            return DEG_LETTERS[degreeAt(this.degree + 1)] + FLAT_LABEL
        }
        return this.shortLabel
    }
    /**
     * Whether this note is equal in absolute value to another
     * @param {any} other
     * @return {boolean}
     */
    equals(other) {
        return other === this || (
            (other instanceof Note) && other.index === this.index
        )
    }

    copy() {
        return new this.constructor(this.index)
    }
}

/**
 * A scale-conscious note, with a tonic and tonality
 */
class TonalNote extends Note {

    /**
     * @param {number} index Absolute note index
     * @param {Note|null} tonic The tonic note, if null self is tonic
     * @param {number} tonality The tonality
     */
    constructor(index, tonic, tonality) {
        super(index)
        if (!Tonality.isValid(tonality)) {
            throw new ValueError(`Invalid tonality: ${tonality}`)
        }
        tonic = tonic || this
        if (!(tonic instanceof Note)) {
            throw new ValueError(`Tonic must be an instance of Note`)
        }
        this.tonic = tonic
        this.tonality = Number(tonality)
    }

    get keySig() {
        return KEYSIG_DATA[this.tonality][this.tonic.degree]
    }

    get shortLabel() {
        if (this.keySig.isSharp) {
            const {majorDegree} = this.keySig
            if (
                // F becomes E-sharp in C-sharp and F-sharp
                (this.degree === 5 && (majorDegree === 1 || majorDegree === 6)) ||
                // C becomes B-sharp in C-sharp
                (this.degree === 0 && majorDegree === 1)
            ) {
                return DEG_LETTERS[degreeAt(this.degree - 1)] + SHARP_LABEL
            }
        } else if (this.keySig.isFlat) {
            if (this.isBlackKey) {
                return super.flattedShortLabel
            }
        }
        return super.shortLabel
    }

    get octave() {
        if (this.degree === 0 && this.keySig.majorDegree === 1 && this.keySig.isSharp) {
            // When C becomes B-sharp we must drop its octave
            return super.octave - 1
        }
        return super.octave
    }

    copy() {
        return new this.constructor(this.index, this.tonic, this.tonality)
    }
}

/**
 * An array of notes with a tonic and tonality
 */
class TonalSample extends Array {

    /**
     * Self-deleting init constructor to support extending Array
     * @param {Note[]} notes
     * @param {Note} tonic
     * @param {number} tonality
     */
    init(notes, tonic, tonality) {
        this.push(...notes)
        if (!Tonality.isValid(tonality)) {
            throw new ValueError(`Invalid tonality: ${tonality}`)
        }
        if (!(tonic instanceof Note)) {
            throw new ValueError(`Tonic must be an instance of Note`)
        }
        this.tonic = tonic
        this.tonality = Number(tonality)
        delete this.init
        return this
    }

    /** @type {object} */
    get keySig() {
        return KEYSIG_DATA[this.tonality][this.tonic.degree]
    }

    /**
     * @return {TonalSample}
     */
    copy(deep = false) {
        const notes = deep ? this.map(note => note ? note.copy() : note) : this
        return new TonalSample().init(notes, this.tonic, this.tonality)
    }
}

/** Frequencies by octave */
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
const FREQS = OCTAVES.flat()
/** Number of supported octaves. */
export const OCTAVE_COUNT = OCTAVES.length
/** Number of known frequencies. */
export const FREQ_COUNT = FREQS.length
/** Minimum known frequency. */
export const FREQ_MIN = FREQS[0]
/** Maximum known frequency. */
export const FREQ_MAX = FREQS[FREQS.length - 1]

/** Note datas, keyed by frequency ID. */
const FREQS_DATA = Object.create(null)
/** Note datas array */
const NOTES_DATA = []

// Populate FREQS_DATA and NOTES_DATA
OCTAVES.forEach((freqs, octave) => {
    freqs.forEach((freq, degree) => {
        const index = octave * OCTAVE + degree
        const freqId = getFreqId(freq)
        const letter = DEG_LETTERS[degree]
        const raised = DEG_LETTERS[degree - 1] === letter
        const data = FREQS_DATA[freqId] = Object.freeze({
            freq, index, freqId, octave,
            letter, raised, degree,
        })
        NOTES_DATA.push(data)
    })
})

/**
 * For key signature, how to get to the major key from a degree for a tonality.
 * A value of `null` represents no key signature, i.e. C-major.
 */
const MAJOR_OFFSETS = Object.fromEntries(Object.entries({
    // Normal modes
    MAJOR: 0,
    DORIAN: -2,
    PHRYGIAN: -4,
    LYDIAN: -5,
    MIXOLYDIAN: -7,
    NATURAL_MINOR: -9,
    LOCRIAN: -11,
    // Other minor
    HARMONIC_MINOR: -9,
    MELODIC_MINOR: -9,
    // Octatonic
    DIMINISHED: null,
    // Hexatonic
    WHOLE_TONE: null,
    AUGMENTED: null,
    PROMETHEUS: null,
    BLUES: -9,
    TRITONE: null,
    // Pentatonic
    MAJOR_PENTATONIC: 0,
    MINOR_PENTATONIC: -9,
    JAPANESE: -9,
}).map(([key, value]) => [Tonality[key], value]))

/**
 * Degrees that prefer flatted major key signatures
 */
const MAJOR_FLAT_DEGREES = {
    // D-flat
    1: true, // either way works, but flat is better for relative B-flat minor
    // E-flat
    3: true,
    // F
    5: true,
    // A-flat
    8: true,
    // B-flat
    10: true,
}

/**
 * Number of accidentals in the major key signatures
 */
const MAJOR_ACCIDENTS = [
    0, // C
    MAJOR_FLAT_DEGREES[1] ? 5 : 7, // D-flat/C-sharp
    2, // D
    3, // E-flat
    4, // E
    1, // F
    6, // F-sharp
    1, // G
    4, // A-flat
    3, // A
    2, // B-flat
    5, // B
]

/**
 * @param {number} degree
 * @param {number} tonality
 * @return {object}
 */
function buildKeySigInfo(degree, tonality) {
    // Normalize to major key signature
    const majorOffset = MAJOR_OFFSETS[tonality]
    const majorDegree = degreeAt(majorOffset === null ? 0 : degree + majorOffset)
    // Relative minor of the major key
    const minorDegree = degreeAt(majorDegree - 3)
    const isMinor = Tonality.isMinor(tonality)
    const isFlat = MAJOR_FLAT_DEGREES[majorDegree] === true
    const root = new Note(isMinor ? minorDegree : majorDegree)
    let label = isFlat ? root.flattedShortLabel : root.shortLabel
    if (isMinor) {
        label += MINOR_LABEL
    }
    return {
        // The label, e.g. 'C#', 'Ebm'
        label,
        // Whether it is a flat-oriented signature
        isFlat,
        // If you're not flat, you're sharp, unless you're C major
        isSharp: !isFlat && majorDegree !== 0,
        // How many accidentals
        accidents: MAJOR_ACCIDENTS[majorDegree],
        // The degree of the major key signature
        majorDegree,
        // The degree of the relative minor of the major degree
        minorDegree,
    }
}

// tonality => degree => data
const KEYSIG_DATA = Object.create(null)
Object.values(Tonality).forEach(tonality => {
    KEYSIG_DATA[tonality] = []
    for (let degree = 0; degree < OCTAVE; degree++) {
        KEYSIG_DATA[tonality].push(
            Object.freeze(
                buildKeySigInfo(degree, tonality)
            )
        )
    }
})