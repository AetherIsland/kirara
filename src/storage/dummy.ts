import * as timers from 'node:timers';

import {
    type BasicFileInfo,
    type RemoteFileInfo,
    type StoragedFileInfo,
    type FileStorage,
    FileStatus
} from '../type.js';

export class Dummy implements FileStorage {
    #files = new Map<string, FileStatus>();

    async getFileInfo(file: BasicFileInfo) {
        const status = this.#files.get(file.md5);
        return {
            status: status ?? FileStatus.ERROR,
            path: `/dummy/${file.md5}/${file.name}`,
            progress: status === FileStatus.DOWNLOADING ? 0.66 : undefined
        } as StoragedFileInfo;
    }

    async removeFile(file: BasicFileInfo) {
        this.#files.delete(file.md5);
        console.log('[Dummy]', file.md5, file.name, '已移除');
    }

    async downloadRemoteFile(remoteFile: RemoteFileInfo) {
        this.#files.set(remoteFile.md5, FileStatus.DOWNLOADING);
        const delay = Math.round(Math.random() * 100_000);
        timers.setTimeout(() => {
            this.#files.set(remoteFile.md5, FileStatus.READY);
            console.log('[Dummy]', remoteFile.md5, remoteFile.name, '已就绪');
        }, delay);
        console.log(
            '[Dummy]',
            remoteFile.md5,
            remoteFile.name,
            '将会在',
            delay,
            '毫秒后就绪'
        );
    }
}
