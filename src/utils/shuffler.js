/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
const OPTKEYS = ['fill', 'start', 'end']
const NONE = Symbol()

/**
 * Shuffler
 */
export default class Shuffler {

    /**
     * Create a shuffler, returns an anonymous function
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
            this.fill.chance = 0
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
            const [key, value] = chances[i]
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
            return arr[keyExpr(key, arr.length)]
        }
        return NONE
    }
}

export {Shuffler}

/**
 * Shuffle an array in place
 * 
 * @param {Array} arr The array
 * @param {object} opts
 * @param {Number} opts.start
 * @param {Number} opts.end
 * @param {Number} opts.limit
 * @return {Array} The array
 */
export function shuffle(arr, opts = undefined) {
    opts = opts || {}
    let {start, end, limit} = opts
    if (limit === undefined) {
        limit = arr.length
    }
    if (start === undefined) {
        start = 0
    }
    if (end === undefined || end >= arr.length) {
        end = arr.length - 1
    }
    for (let i = end, n = 0; i > start && n <= limit; i--, n++) {
        const j = randomInt(start, i)
        const temp = arr[i]
        arr[i] = arr[j]
        arr[j] = temp
    }
    return arr
}

/**
 * @param {String} key
 * @param {Number} length
 * @return {Number}
 */
function keyExpr(key, length) {
    if (key[0] === '/') {
        let i = 1
        let rounder = Math.round
        if (key[i] === '/') {
            i += 1
            rounder = Math.floor
        } else if (key[i] === 'c') {
            i += 1
            rounder = Math.ceil
        }
        return rounder(length / Number(key.substring(i)))
    }
    key = Number(key)
    if (key < 0) {
        return length + key
    }
    return key
}

/**
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

/**
 * @param {Array} a
 * @param {Array} b
 * @return {Number}
 */
function entrySorter(a, b) {
    return a[1] - b[1]
}
