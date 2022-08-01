import {shuffle, Shuffler} from './shuffler.js'

export const NONE = () => {}
export const RANDY = shuffle


export const TONAK = new Shuffler({
    fill: {
        chance: 0.3,
        chances: {
            0: 0.5,
            random: 0.6,
            null: 1,
        }
    },
    start: {
        chances: {
            0: 0.55,
        }
    }
})

export const SOFA = new Shuffler({
    // shuffle: halfShuffle,
    fill: {
        chance: 0.35,
        chances: {
            random: 0.05,
            null : 0.15,
            '//3' : 0.40,
            '/c3' : 0.45,
            '//2' : 0.50,
            '/c2' : 0.55,
        }
    },
    start: {
        chances: {
            0: 0.5,
        }
    }
})

export const BIMOM = new Shuffler({
    shuffle: halfShuffle,
    fill: {
        chance: 0.05,
        chances: {
            0: 0.1,
            '/c2' : 0.2,
            null: 1
        }
    },
    start: {
        chances: {
            0: 0.25,
        }
    },
    end: {
        chances: {
            1: 0.1,
            '-1': 0.25,
        }
    }
})


export const JARD = new Shuffler({
    shuffle: arr => {
        // Shuffle the 2nd-5th notes
        shuffle(arr, {start: 1, end: 4})
        // Shuffle 25% of the upper half of the notes
        const start = Math.floor(arr.length / 2)
        const limit = Math.max(3, Math.floor(arr.length / 4))
        shuffle(arr, {limit, start})
    },
    fill: {
        chance: 0.15,
        chances: {
            random: 0.15,
            '//2' : 0.30,
            '/c2' : 0.31,
            null: 1,
        }
    }
})

export const CHUNE = arr => {
    // Don't fail if state is missing
    if (!arr.state) {
        SOFA(arr)
        return
    }
    const {counter, prev} = arr.state
    let delegate = SOFA
    let isRephrase = false
    if (counter > 0) {
        if (counter % 13 === 0) {
            delegate = BIMOM
        } else if (counter % 8 === 0) {
            delegate = JARD
        } else if (counter % 5 === 0) {
            delegate = TONAK
        } else if (counter % 3 === 0) {
            isRephrase = (
                prev && prev.length > 6 &&
                prev.at(-2) !== prev.at(-1)
            )
        }
    }
    if (isRephrase) {
        console.debug('running chune re-phrase')
        for (let i = 0; i < arr.length && i < prev.length; i++) {
            arr[i] = prev[i]
        }
        shuffle(arr, {start: 0, end: 2})
        shuffle(arr, {start: arr.length - 3})
    } else {
        delegate(arr)
    }
}


function halfShuffle(arr) {
    shuffle(arr, {limit: Math.floor(arr.length / 2)})
}