/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import * as Utils from './utils.js'
 
const {ValueError} = Utils
 
const FILLDROP = 3

export default function Shuffler(opts) {
    opts = opts || {}
    const fill = opts.fill || {}
    const start = opts.start || {}
    const fills = Object.entries(fill.probabilities || {}).sort(entrySorter)
    const starts = Object.entries(start.probabilities || {}).sort(entrySorter)

    const fillReplace = fill.replace || FILLDROP
    return arr => {
        if (arr.length < 2) {
            return arr
        }
        const tonic = arr[0]
        let P = Math.random()

        for (let i = 0; i < fills.length; i++) {
            let [key, value] = fills[i]
            if (P <= 1 - value) {
                continue
            }
            let fill
            switch (key) {
                case 'tonic':
                    fill = tonic
                    break
                case 'random':
                    fill = randomElement(arr)
                    break
                case 'none':
                    fill = null
                    break
                default:
                    throw new ValueError(`Unknown fill: ${key}`)
            }
            Utils.shuffle(arr)
            for (let j = 1; j < arr.length; j += fillReplace) {
                arr[j] = fill
            }
            P = Math.random()
            break
        }

        Utils.shuffle(arr)

        for (let i = 0; i < starts.length; i++) {
            let [key, value] = starts[i]
            if (P <= 1 - value) {
                continue
            }
            let start
            switch (key) {
                case 'tonic':
                    start = tonic
                    break
                default:
                    throw new ValueError(`Unknown start: ${start}`)
            }
            let temp = arr[0]
            arr[0] = start
            arr[1] = temp
        }
        return arr
    }
}

export {Shuffler}

function entrySorter(a, b) {
    return a[1] - b[1]
}

/**
 * @param {Array} arr The input array
 * @return {Number} A random index of the array
 */
function randomIndex(arr) {
    Math.floor(Math.random() * arr.length)
}

/**
 * @param {Array} arr The input array
 * @return {*} The value of a random index of the array
 */
function randomElement(arr) {
    return arr[randomIndex(arr)]
}