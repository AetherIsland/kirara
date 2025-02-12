import * as child_process from 'node:child_process';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';

import { FileStatus, type BasicFileInfo, type FileStorage, type RemoteFileInfo, type StoragedFileInfo } from '../type.js';
import { doSthIgnoreErrs } from '../utils.js';

export class Aria2 implements FileStorage {
    #root: string;
    #baseURL?: URL;
    #downloaders = new Map<string, child_process.ChildProcess>();
    constructor(root: string, baseURL?: string) {
        this.#root = path.normalize(root);
        if (baseURL) {
            this.#baseURL = new URL(baseURL);
        }
    }
    #getAbsolutePath(file: BasicFileInfo) {
        return {
            dirPath: path.join(this.#root, file.md5),
            filePath: path.join(this.#root, file.md5, file.name),
            statusPath: path.join(this.#root, file.md5, file.name + '.aria2')
        };
    }
    async getFileInfo(file: BasicFileInfo) {
        const { filePath, statusPath } = this.#getAbsolutePath(file);
        await fsPromises.stat(filePath);
        const hasStatus = !!(await doSthIgnoreErrs(['ENOENT'], async () => await fsPromises.stat(statusPath)));
        let publicURL = `${file.md5}/${file.name}`;
        if (this.#baseURL) {
            publicURL = new URL(publicURL, this.#baseURL).href;
        }
        const info: StoragedFileInfo = {
            status: FileStatus.ERROR,
            path: publicURL
        };
        if (hasStatus) {
            if (this.#downloaders.has(filePath)) {
                info.status = FileStatus.DOWNLOADING;
            }
        } else {
            info.status = FileStatus.READY;
        }
        return info;
    }
    async removeFile(file: BasicFileInfo) {
        const { dirPath, filePath, statusPath } = this.#getAbsolutePath(file);
        const proc = this.#downloaders.get(filePath);
        if (proc) {
            proc.kill();
        }
        await doSthIgnoreErrs(['ENOENT'], () => Promise.all([fsPromises.rm(filePath), fsPromises.rm(statusPath)]));
        await doSthIgnoreErrs(['ENOENT', 'ENOTEMPTY'], () => fsPromises.rmdir(dirPath));
    }
    async downloadRemoteFile(remoteFile: RemoteFileInfo) {
        const { dirPath, filePath } = this.#getAbsolutePath(remoteFile);
        await doSthIgnoreErrs(['EEXIST'], () => fsPromises.mkdir(dirPath));
        const proc = child_process.spawn(
            'aria2c',
            [
                '--check-integrity=true',
                `--checksum=md5=${remoteFile.md5}`,
                '-d',
                dirPath,
                '-o',
                remoteFile.name,
                remoteFile.url
            ],
            { stdio: 'ignore' }
        );
        this.#downloaders.set(filePath, proc);
        proc.once('error', (err) => {
            console.log('[Aria2] aria2c 进程操作发生错误', err);
            this.#downloaders.delete(filePath);
        });
        proc.once('exit', (code, signal) => {
            if (code !== 0) {
                console.log('[Aria2] aria2c 进程异常退出', { code, signal });
            }
            this.#downloaders.delete(filePath);
        });
    }
}
