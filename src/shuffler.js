/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
import {shuffle} from './utils.js'
 
const OPTKEYS = ['fill', 'start', 'end']
const FILL_CHANCE = 0.3
const NONE = Symbol()

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
        this.shuffle = opts.shuffle || shuffle
        OPTKEYS.forEach(opt => {
            this[opt] = opts[opt] ? {...opts[opt]} : {}
            this[opt].chances = opts[opt]
                ? Object.entries(opts[opt].chances || {}).sort(entrySorter)
                : []
        })
        if (this.fill.chance === undefined) {
            this.fill.chance = FILL_CHANCE
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
        const ender = this.getValue(arr, this.end.chances)
        if (filler !== NONE) {
            for (let i = 0; i < arr.length; i++) {
                if (this.fill.chance >= Math.random()) {
                    arr[i] = filler
                }
            }
        }
        this.shuffle(arr)
        if (starter !== NONE) {
            arr[0] = starter
        }
        if (ender !== NONE) {
            arr[arr.length - 1] = ender
        }
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
                    return arr[Math.floor(Math.random() * arr.length)]
                case 'null':
                    return null
                case 'undefined':
                    return undefined
            }
            key = Number(key)
            if (key < 0) {
                key = arr.length + key
            }
            return arr[key]
        }
        return NONE
    }
}

export {Shuffler}


/**
 * @param {Array} a
 * @param {Array} b
 * @return {Number}
 */
function entrySorter(a, b) {
    return a[1] - b[1]
}
