/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */

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
 * @param {Number} min
 * @param {Number} max
 * @return {Number}
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}
