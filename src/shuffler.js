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

    /**
     * Create a shuffler
     * @param {{
     *  shuffle: Function,
     *  fill: {replace: Number, probabilities: {}},
     *  start: {probabilities: {}}
     * }} opts
     * @return {Function} Anonymous function
     */
    constructor(opts = undefined) {
        opts = opts || {}
        if (opts.shuffle) {
            this.shuffle = opts.shuffle
        }
        if (opts.fill && opts.fill.replace) {
            this.fillReplace = opts.fill.replace
        }
        for (const opt of ['fill', 'start']) {
            if (opts[opt] && opts[opt].probabilities) {
                this[opt] = sortedEntries(opts[opt].probabilities)
            }
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
        const filler = this.getFiller(arr)
        const starter = this.getStarter(arr)
        this.shuffle(arr)
        if (filler !== undefined) {
            for (let i = 0; i < arr.length; i++) {
                if (this.fillReplace >= Math.random()) {
                    arr[i] = filler
                }
            }
            this.shuffle(arr)
        }
        if (starter !== undefined) {
            arr[0] = starter
        }
    }

    /**
     * @param {Array} arr
     */
    getFiller(arr) {
        const p = Math.random()
        for (let i = 0; i < this.fill.length; i++) {
            let [key, value] = this.fill[i]
            if (value < p) {
                continue
            }
            switch (key) {
                case 'random':
                    return randomElement(arr)
                case 'none':
                    return null
            }
            if (arr[+key] === undefined) {
                throw new ValueError(`Unknown fill: ${key}`)
            }
            return arr[key]
        }
    }

    /**
     * @param {Array} arr
     */
    getStarter(arr) {
        const p = Math.random()
        for (let i = 0; i < this.start.length; i++) {
            let [key, value] = this.start[i]
            if (value < p) {
                continue
            }
            if (arr[+key] === undefined) {
                throw new ValueError(`Unknown start: ${key}`)
            }
            return arr[key]
        }
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