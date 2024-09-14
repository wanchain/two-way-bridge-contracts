const Bridge = require('./Bridge.js')

async function main() {
    let a =  await Bridge.Bridge.createFromDeploy()
    console.log("a:", a)
}

main()