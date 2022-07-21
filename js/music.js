/**
 * Western 12-tone music module.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import * as Utils from './utils.js'

/**
 * Adjust a frequency by a number of half-steps. 
 * 
 * @param {Number} base The base frequency. Performs internal floor rounding
 *   to get a valid value. If a valid value is not found, and `strict` is not
 *   specified, the closest frequency is used.
 * @param {Number} degrees The number of half-steps (+/-).
 * @param {Boolean} strict Do not adjust base to closest known frequency.
 * @return {Number|undefined} The frequency, or undefined if out of range.
 */
export function stepFreq(base, degrees = 0, strict = false) {
    let baseData = FREQS_DATA[getFreqId(base)]
    if (!baseData && !strict) {
        baseData = FREQS_DATA[getFreqId(closestFreq(base))]
    }
    if (baseData) {
        return FREQS[baseData.freqIndex + Number(degrees)]
    }
}

/**
 * Find the closest known frequency.
 * 
 * @param {Number} target The search value.
 * @return {Number} The closest known frequency.
 */
export function closestFreq(target) {
    const {value} = Utils.closest(target, FREQS)
    return value
}

/**
 * @param {String|Number}
 * @return {String}
 */
function getFreqId(value) {
    return String(Math.floor(Number(value)))
}

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

/**
 * Flat list of frequency values.
 */
const FREQS = new Float32Array(OCTAVES.length * 12)

/**
 * Frequency data, keyed by frequency ID.
 */
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

export const FREQ_MIN = FREQS[0]
export const FREQ_MAX = FREQS[FREQS.length - 1]