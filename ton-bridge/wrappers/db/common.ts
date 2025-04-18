import * as fs from 'fs';
import * as path from 'path';

export const DBDataDir = path.join(...[__dirname,"/../data/"]);
console.log("__dirname",__dirname);
console.log("DBDataDir",DBDataDir);

export  function listJsonFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    console.log("files",files);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            listJsonFiles(filePath, fileList);
        } else if (path.extname(filePath) === '.json') {
            fileList.push(file.slice(0,file.length-5));
        }
    }
    return fileList;
}