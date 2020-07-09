const crypto = require('crypto');

var eccEncrypt = async function secp256k1Encrypt(publicKey, data, ephemPrivateKey, iv0) {
    // console.log("plainMsg=" + data)
    var ecdh = crypto.createECDH('secp256k1');

    var rbPriv = ephemPrivateKey? Buffer.from(ephemPrivateKey, 'hex') : crypto.randomBytes(32);
    // console.log("rbPriv=" + rbPriv.toString('hex'))
    ecdh.setPrivateKey(rbPriv);

    var rbpubun = Buffer.from(ecdh.getPublicKey('hex', 'uncompressed'), 'hex');
    // console.log("rbpubun=" + rbpubun.toString('hex'))

    var shared = ecdh.computeSecret(publicKey, null, 'hex');
    // console.log("sharedKey=" + shared.toString('hex'))

    var derivedKey = crypto.pbkdf2Sync(shared,' ',2, 64, 'sha256');
    // console.log("derivedKey=" + derivedKey.toString('hex'))

    var encKey = derivedKey.slice(0,16)
    // console.log("encKey=" + encKey.toString('hex'))

    var macKey = derivedKey.slice(16,32)
    // console.log("macKey=" + macKey.toString('hex'))

    var keyHash = crypto.createHash('sha256');
    macKey = keyHash.update(macKey).digest();
    // console.log("hashmacKey=" + macKey.toString('hex'))

    var iv = iv0? Buffer.from(iv0, 'hex') : crypto.randomBytes(16);
    // console.log("iv=" + iv.toString('hex'));

    var em = aesencrypt(encKey,iv,data);
    // console.log("encryptedMsg=" + em.toString('hex'))

    let hmac = crypto.createHmac('sha256', macKey);
    hmac.update(em,'hex');
    var mac = hmac.digest();
    // console.log("mac=" + mac.toString('hex'))


    var res = rbpubun.toString('hex');
    res += iv.toString('hex');
    res += em.toString('hex');
    res += mac.toString('hex');

    return {ephemPrivateKey: rbPriv.toString('hex'), ciphertext: res};
}

var eccDecrypt = async function secp256k1Decrypt(privateKey, data) {

    var ecdh = crypto.createECDH('secp256k1');
    ecdh.setPrivateKey(privateKey);

    var len = Buffer.byteLength(data,'hex');
    // console.log("data length=" + len)
    var bufferData = Buffer.from(data,'hex');

    var rbpub = bufferData.slice(0,65);
    // console.log("rbpub=" + rbpub.toString('hex'));

    var iv =  bufferData.slice(65,65 + 16);
    // console.log("iv = " + iv.toString('hex'));

    var em = bufferData.slice(65 + 16,len - 32)
    // console.log("em = " + em.toString('hex'));

    var mac = bufferData.slice(len - 32)
    // console.log("mac = " + mac.toString('hex'));

    var shared = ecdh.computeSecret(rbpub, null, 'hex');
    // console.log("sharedKey=" + shared.toString('hex'))

    var derivedKey = crypto.pbkdf2Sync(shared,' ',2, 64, 'sha256');
    // console.log("derivedKey=" + derivedKey.toString('hex'))

    var encKey = derivedKey.slice(0,16)
    // console.log("encKey=" + encKey.toString('hex'))

    var macKey = derivedKey.slice(16,32)
    // console.log("macKey=" + macKey.toString('hex'))

    var keyHash = crypto.createHash('sha256');
    macKey = keyHash.update(macKey).digest();
    // console.log("hashmacKey=" + macKey.toString('hex'))

    let hmac = crypto.createHmac('sha256', macKey);
    hmac.update(em,'hex');
    var commac = hmac.digest();
    if (commac.toString('hex') != mac.toString('hex')) {
        return "";
    }

    var dm = asedecrypt(encKey,iv,em.toString('hex'));

    return dm;
}

function aesencrypt(key, iv, data) {
    var cipher = crypto.createCipheriv('aes-128-cbc',key, iv);
    var crypted = cipher.update(data,'hex','hex');
    crypted += cipher.final('hex');
    crypted = Buffer.from(crypted, 'hex').toString('hex');
    return crypted;
};

function asedecrypt(key, iv, crypted) {
    crypted = Buffer.from(crypted, 'hex').toString('hex');
    var decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    var decoded = decipher.update(crypted, 'hex', 'hex');
    decoded += decipher.final('hex');
    return decoded;
};

module.exports = {
  eccEncrypt,
  eccDecrypt
}
