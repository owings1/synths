/**
 * General utils.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */
export class ValueError extends Error {}

/**
 * Find the closest value of `target` in `arr`
 * 
 * @param {Number} target The search value
 * @param {Number[]} arr The array to search
 * @return {Number|undefined} Closest value in array, or
 *  undefined if array is empty
 */
export function closest(target, arr) {
    const {length} = arr
    if (length === 0) {
        return
    }
    if (length === 1) {
        return arr[0]
    }
    target = Number(target)
    let min = Infinity
    let low = 0
    let high = length - 1
    let index
    while (low <= high) {
        const mid = Math.floor((low + high) / 2)
        let diff
        if (mid + 1 < length) {
            diff = Math.abs(arr[mid + 1] - target)
            if (diff < min) {
                min = diff
                index = mid + 1
            }
        }
        if (mid > 0) {
            diff = Math.abs(arr[mid - 1] - target)
            if (diff < min) {
                min = diff
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
    return arr[index]
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
 * Map inclusive range
 * 
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
 * Inclusive range
 * 
 * @param {Number} start
 * @param {Number} end
 * @param {Number} step
 * @return {Number[]}
 */
export function range(start, end, step = 1) {
    return mapRange(start, end, step, n => n)
}
