/**
 * General utils.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */

/**
 * Find the closest index and value of `target` in `arr`.
 * 
 * @param {Number} target The search value.
 * @param {Number[]} arr The array to search.
 * @return {object|undefined} Object with `index` and `value` properties, or
 *  undefined if array is empty.
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
        let diffLeft
        let diffRight
        if (mid + 1 < length) {
            diffRight = Math.abs(arr[mid + 1] - target)
        }
        if (mid > 0) {
            diffLeft = Math.abs(arr[mid - 1] - target)
        }
        if (diffLeft !== undefined && diffLeft < minDiff) {
            minDiff = diffLeft
            index = mid - 1
        }
        if (diffRight !== undefined && diffRight < minDiff) {
            minDiff = diffRight
            index = mid + 1
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