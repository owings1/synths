import {expect} from 'chai'
import {describe, it} from 'mocha'

describe('smoothing', () => {
    function smooth(arr) {
        if (arr.length < 3) {
            return
        }
        for (let i = 1; i < arr.length - 1; ++i) {
            let prev = arr[i - 1]
            let curr = arr[i]
            let next = arr[i + 1]
            if (prev < curr && curr < next || prev > curr && curr > next || curr === next) {
                continue
            }
            arr[i + 1] = curr
            arr[i] = next
        }
    }
    it('should', () => {

    })
})