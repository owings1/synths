/**
 * General utils.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
export class ValueError extends Error {}

/**
 * Find the closest index and value of `target` in `arr`
 * 
 * @param {Number} target The search value
 * @param {Number[]} arr The array to search
 * @return {object|undefined} Object with `index` and `value` properties, or
 *  undefined if array is empty
 */
export function closest(target, arr) {
    const {length} = arr
    if (length === 0) {
        return
    }
    if (length === 1) {
        return {index: 0, value: arr[0]}
    }
    target = Number(target)
    let minDiff = Infinity
    let low = 0
    let high = length - 1
    let index
    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        let diff
        if (mid + 1 < length) {
            diff = Math.abs(arr[mid + 1] - target)
            if (diff < minDiff) {
                minDiff = diff
                index = mid + 1
            }
        }
        if (mid > 0) {
            diff = Math.abs(arr[mid - 1] - target)
            if (diff < minDiff) {
                minDiff = diff
                index = mid - 1
            }
        }
        if (arr[mid] < target) {
            low = mid + 1
        } else if (arr[mid] > target) {
            high = mid - 1
        } else {
            index = mid
            break
        }
    }
    return {index, value: arr[index]}
}

/**
 * Shuffle an array in place
 * 
 * @param {Array} arr The array
 * @return {Array} The array
 */
export function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1))
        let temp = arr[i]
        arr[i] = arr[j]
        arr[j] = temp
    }
    return arr
}

/**
 * Flip keys and values
 * 
 * @param {object} obj
 * @return {object}
 */
export function flip(obj) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]))
}

/**
 * @param {Number} start
 * @param {Number} end
 * @param {Number|Function} stepOrCb
 * @param {Function|undefined} cbOrNone
 * @return {Array}
 */
export function mapRange(start, end, ...args) {
    const cb = args.pop()
    const step = args.pop() || 1
    const arr = []
    for (let i = start; i <= end; i += step) {
        arr.push(cb(i))
    }
    return arr
}

/**
 * @param {Number} start
 * @param {Number} end
 * @param {Number} step
 * @return {Number[]}
 */
export function range(start, end, step = 1) {
    return mapRange(start, end, step, n => n)
}
