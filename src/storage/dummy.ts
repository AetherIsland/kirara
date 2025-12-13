import * as timers from 'node:timers';

import type { BasicFileInfo, FileStorage, RemoteFileInfo, StoragedFileInfo } from '../type.ts';

export class Dummy implements FileStorage {
    #files = new Map<string, 'ERROR' | 'READY' | 'DOWNLOADING'>();

    async getFileInfo(file: BasicFileInfo) {
        const status = this.#files.get(file.md5);
        return {
            status: status ?? 'ERROR',
            path: `/dummy/${file.md5}/${file.name}`,
            progress: status === 'DOWNLOADING' ? 0.66 : undefined
        } as StoragedFileInfo;
    }

    async removeFile(file: BasicFileInfo) {
        this.#files.delete(file.md5);
        console.log('[Dummy]', file.md5, file.name, '已移除');
    }

    async downloadRemoteFile(remoteFile: RemoteFileInfo) {
        this.#files.set(remoteFile.md5, 'DOWNLOADING');
        const delay = Math.round(Math.random() * 100_000);
        timers.setTimeout(() => {
            this.#files.set(remoteFile.md5, 'READY');
            console.log('[Dummy]', remoteFile.md5, remoteFile.name, '已就绪');
        }, delay);
        console.log('[Dummy]', remoteFile.md5, remoteFile.name, '将会在', delay, '毫秒后就绪');
    }
}
