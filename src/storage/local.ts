import * as path from 'node:path';
import * as fsPromises from 'node:fs/promises';

import { DownloaderHelper } from 'node-downloader-helper';

import {
    FileStatus,
    type BasicFileInfo,
    type RemoteFileInfo,
    type FileStorage,
    type StoragedFileInfo
} from '../type.js';
import { doSthIgnoreErrs } from '../utils.js';

export class Local implements FileStorage {
    #root: string;
    #baseURL?: URL;
    #downloaders = new Map<string, DownloaderHelper>();
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
            statusPath: path.join(this.#root, file.md5, '.status')
        };
    }
    async #setFileStatus(file: BasicFileInfo, status: FileStatus) {
        const statusPath = this.#getAbsolutePath(file).statusPath;
        await fsPromises.writeFile(statusPath, status);
    }
    async getFileInfo(file: BasicFileInfo) {
        const { filePath, statusPath } = this.#getAbsolutePath(file);
        const statusFileContent = await fsPromises.readFile(statusPath, {
            encoding: 'utf8'
        });
        let publicURL = `${file.md5}/${file.name}`;
        if (this.#baseURL) {
            publicURL = new URL(publicURL, this.#baseURL).href;
        }
        const info: StoragedFileInfo = {
            status: FileStatus.ERROR,
            path: publicURL
        };
        switch (statusFileContent) {
            case FileStatus.READY:
                await doSthIgnoreErrs(['ENOENT'], async () => {
                    await fsPromises.stat(filePath);
                    info.status = FileStatus.READY;
                });
                break;
            case FileStatus.DOWNLOADING:
                const dl = this.#downloaders.get(filePath);
                if (dl) {
                    info.progress = dl.getStats().progress;
                }
                info.status = FileStatus.DOWNLOADING;
                break;
        }
        return info;
    }
    async removeFile(file: BasicFileInfo) {
        const { dirPath, filePath, statusPath } = this.#getAbsolutePath(file);
        const dl = this.#downloaders.get(filePath);
        if (dl) {
            await dl.stop();
            this.#downloaders.delete(filePath);
        }
        await doSthIgnoreErrs(['ENOENT'], () =>
            Promise.all([fsPromises.rm(filePath), fsPromises.rm(statusPath)])
        );
        await doSthIgnoreErrs(['ENOENT', 'ENOTEMPTY'], () =>
            fsPromises.rmdir(dirPath)
        );
    }
    async downloadRemoteFile(remoteFile: RemoteFileInfo) {
        const { dirPath: dlDir, filePath } = this.#getAbsolutePath(remoteFile);
        await doSthIgnoreErrs(['EEXIST'], () => fsPromises.mkdir(dlDir));
        await this.#setFileStatus(remoteFile, FileStatus.DOWNLOADING);
        const dl = new DownloaderHelper(remoteFile.url.href, dlDir, {
            resumeIfFileExists: true,
            fileName: remoteFile.name,
            override: {
                skip: true
            }
        });
        this.#downloaders.set(filePath, dl);
        const info = await dl.getTotalSize();
        if (info.name !== remoteFile.name || info.total !== remoteFile.size) {
            await this.#setFileStatus(remoteFile, FileStatus.ERROR);
            throw new Error('FileInfo is inconsistent.');
        }
        dl.on('error', async (err) => {
            // console.log('Download Failed', err);
            await this.#setFileStatus(remoteFile, FileStatus.ERROR);
        });
        dl.on('end', async () => {
            // console.log('Download Completed');
            await this.#setFileStatus(remoteFile, FileStatus.READY);
            this.#downloaders.delete(filePath);
        });
        dl.start();
        await this.#setFileStatus(remoteFile, FileStatus.DOWNLOADING);
    }
}
