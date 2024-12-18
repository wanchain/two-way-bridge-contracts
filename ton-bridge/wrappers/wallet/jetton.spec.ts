import {buildWrappedJettonContent,parseWrappedJettonContent} from "./jetton";

const opts= {
    name:'dog',   // string
    symbol:'dog symbol', // string
    decimal:'5',  // string
}

describe('jetton content', () => {

    beforeAll(async () => {
    });

    beforeEach(async () => {

    });


    it('build jetton content', async () => {
        let ret = await buildWrappedJettonContent(opts);
        console.log(ret);

        let optsNew = await parseWrappedJettonContent(ret);
        console.log(optsNew);
    });

});