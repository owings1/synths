/**
 * WebAudio effects.
 * 
 * @author Doug Owings <doug@dougowings.net>
 * @license MIT
 */

/**
 * Build a simple linear chain. Adds `receiver`, `prev`, `next`, `active`
 * properties to nodes in `chain`, and `receiver` property to input and
 * output. Setting a node's `active` property connects it's prev and next
 * to either itself, or a dummy `bypass` GainNode. 
 * 
 * All nodes in `chain` will be disconnected and setup as inactive.
 * 
 * @param {AudioNode} input The input node.
 * @param {AudioNode} output The output node.
 * @param {AudioNode[]} chain The effects chain.
 */
export default function initChain(input, output, chain) {

    const {context} = input
    input.receiver = input
    output.receiver = output
    
    chain.forEach((node, i) => {
 
        node.disconnect()

        node.prev = chain[i - 1] || input
        node.next = chain[i + 1] || output
        const bypass = new GainNode(context)
        node.receiver = bypass
        let active = false
     
        Object.defineProperties(node, {
            active : {
                get: () => active,
                set: function(value) {
                    value = Boolean(value)
                    if (value === active) {
                        return
                    }
                    active = value
                    const {prev, next} = this
                    // Disconnect
                    if (prev) {
                        prev.receiver.disconnect(this.receiver)
                    }
                    if (next) {
                        this.receiver.disconnect(next.receiver)
                    }
                    // Change receiver
                    this.receiver = active ? this : bypass
                    // Reconnect
                    if (prev) {
                        prev.receiver.connect(this.receiver)
                    }
                    if (next) {
                        this.receiver.connect(next.receiver)
                    }
                },
            },
        })
    })
    
    // Initialize connections.
    chain.forEach(node => {
        if (node.prev) {
            node.prev.receiver.connect(node.receiver)
        }
        if (node.next) {
            node.receiver.connect(node.next.receiver)
        }
    })
}

export {initChain}