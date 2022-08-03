
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
        return (arr, ...args) => {
            if (arr.length > 1) {
                this.run(arr, ...args)
            }
            return arr
        }
    }

    /**
     * @param {Array} arr
     */
    run(arr, ...args) {
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
        this.shuffle(arr, ...args)
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
 * @param {Array} a
 * @param {Array} b
 * @return {Number}
 */
function entrySorter(a, b) {
    return a[1] - b[1]
}

