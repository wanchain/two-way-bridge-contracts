const fs = require('fs');

function main() {
    const readStream = fs.createReadStream(__dirname+'/../contracts/imports/common/opcode.fc', { encoding: 'utf8' });
    const rl = require('readline').createInterface({
        input: readStream,
        crlfDelay: Infinity
    });
    let lines = []
    rl.on('line', (line) => {
        lines.push(line)
    });

    const destfile = __dirname+'/../wrappers/opcodes.ts'
    fs.unlinkSync(destfile)
    rl.on('close', () => {
        lines.map(line=>{
            if(line != '' && !line.startsWith(';;')){
                fs.appendFileSync(destfile, 'export '+line+'\n',)
            }
        })
    });}


main()