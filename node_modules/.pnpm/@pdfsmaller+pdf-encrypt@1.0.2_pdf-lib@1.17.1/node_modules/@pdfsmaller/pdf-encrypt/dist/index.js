const { encryptPDF } = require('./pdf-encrypt.js');
const { md5, RC4, hexToBytes, bytesToHex } = require('./crypto-rc4.js');
const { sha256, sha384, sha512, aes256CbcEncrypt, aes256CbcEncryptNoPad, aes256EcbEncryptBlock, computeHash2B, concat } = require('./crypto-aes.js');

module.exports = { encryptPDF, md5, RC4, hexToBytes, bytesToHex, sha256, sha384, sha512, aes256CbcEncrypt, aes256CbcEncryptNoPad, aes256EcbEncryptBlock, computeHash2B, concat };
