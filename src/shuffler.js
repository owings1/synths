/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import * as Utils from './utils.js'
 
const {ValueError} = Utils
 
const FILL_REPLACE = 0.3

export default class Shuffler {

    constructor(opts) {
        opts = opts || {}
        const fill = opts.fill || {}
        const start = opts.start || {}
        const shuffle = opts.shuffle || Utils.shuffle
        const fills = Object.entries(fill.probabilities || {}).sort(entrySorter)
        const starts = Object.entries(start.probabilities || {}).sort(entrySorter)

        const fillReplace = fill.replace === undefined
            ? FILL_REPLACE
            : fill.replace

        return arr => {
            if (arr.length < 2) {
                return arr
            }
            const tonic = arr[0]
            let P = Math.random()

            for (let i = 0; i < fills.length; i++) {
                let [key, value] = fills[i]
                if (value < P) {
                    continue
                }
                let fill
                let keyn = Number(key)
                if (Number.isInteger(keyn) && arr[keyn]) {
                    fill = arr[keyn]
                } else {
                    switch (key) {
                        case 'tonic':
                            fill = tonic
                            break
                        case 'random':
                            fill = arr[randomIndex(arr) || 1]
                            break
                        case 'none':
                            fill = null
                            break
                        default:
                            throw new ValueError(`Unknown fill: ${key}`)
                    }
                }
                shuffle(arr)
                for (let j = 0; j < arr.length; j++) {
                    if (fillReplace >= Math.random()) {
                        arr[j] = fill
                    }
                }
                P = Math.random()
                break
            }

            shuffle(arr)

            for (let i = 0; i < starts.length; i++) {
                let [key, value] = starts[i]
                if (value < P) {
                    continue
                }
                let start
                let keyn = Number(key)
                if (Number.isInteger(keyn) && arr[keyn]) {
                    start = arr[keyn]
                } else {
                    switch (key) {
                        case 'tonic':
                            start = tonic
                            break
                        default:
                            throw new ValueError(`Unknown start: ${start}`)
                    }
                }
                arr[0] = start
            }
            return arr
        }
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
    return Math.floor(Math.random() * arr.length)
}

/**
 * @param {Array} arr The input array
 * @return {*} The value of a random index of the array
 */
function randomElement(arr) {
    return arr[randomIndex(arr)]
}