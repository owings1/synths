/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import * as Utils from './utils.js'
 
const {ValueError} = Utils
 
const FILL_REPLACE = 0.3
const None = Symbol()

export default class Shuffler {

    /**
     * Create a shuffler
     * @param {{
     *  shuffle: Function,
     *  fill: {chance: Number, chances: {}},
     *  start: {chances: {}}
     * }} opts
     * @return {Function} Anonymous function
     */
    constructor(opts = undefined) {
        opts = opts || {}
        if (opts.shuffle) {
            this.shuffle = opts.shuffle
        }
        for (const opt of ['fill', 'start']) {
            this[opt] = opts[opt] ? {...opts[opt]} : {}
            this[opt].chances = opts[opt]
                ? sortedEntries(opts[opt].chances || {})
                : []
        }
        return arr => {
            if (arr.length > 1) {
                this.run(arr)
            }
            return arr
        }
    }

    /**
     * @param {Array} arr
     */
    run(arr) {
        const filler = this.getValue(arr, this.fill.chances)
        const starter = this.getValue(arr, this.start.chances)
        // console.log(arr[0], {filler, starter})
        if (filler !== None) {
            for (let i = 0; i < arr.length; i++) {
                if (this.fill.chance >= Math.random()) {
                    arr[i] = filler
                }
            }
        }
        this.shuffle(arr)
        if (starter !== None) {
            arr[0] = starter
        }
        console.log(arr)
    }

    /**
     * @param {Array} arr
     */
    getValue(arr, chances) {
        const p = Math.random()
        for (let i = 0; i < chances.length; i++) {
            let [key, value] = chances[i]
            if (value < p) {
                continue
            }
            switch (key) {
                case 'random':
                    return randomElement(arr)
                case 'null':
                    return null
                case 'undefined':
                    return undefined
            }
            return arr[key]
        }
        return None
    }
}

Shuffler.prototype.shuffle = Utils.shuffle
Shuffler.prototype.fill = []
Shuffler.prototype.start = []
Shuffler.prototype.fillReplace = FILL_REPLACE

export {Shuffler}

/**
 * @param {{}} obj
 * @return {Array[]} entries sorted numerically by value
 */
function sortedEntries(obj) {
    return Object.entries(obj).sort(entrySorter)
}

/**
 * @param {Array} a
 * @param {Array} b
 * @return {Number}
 */
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