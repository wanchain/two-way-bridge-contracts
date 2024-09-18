const Bridge = require('./Bridge.js')

async function main() {
    let a =  await Bridge.Bridge.deploy()
    console.log("a:", a)
}

main()