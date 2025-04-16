export const DBDataDir = "../../data/";


import * as fs from 'fs';
import * as path from 'path';

export  function listJsonFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            listJsonFiles(filePath, fileList); // 递归处理子目录
        } else if (path.extname(filePath) === '.json') {
            fileList.push(filePath); // 添加.json文件路径
        }
    }
    return fileList;
}