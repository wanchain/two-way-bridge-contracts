

function main() {
    let m = new Map()
    let from = 5
    let total = 21
    console.log("m[0]:", m[0])
    for(let i =1; i<60; i++){
        let j
        for(j=total-1; j>from; j--) {
            if(!m[j] || i > m[j]){
                continue
            }
        }
        if(j<total-1){
            for(let k=total-2; k>=j; k--){
                m[k+1] = m[k]
            }
            m[j] = i;
        }
        console.log("m:",m)
    }
}

main();