import * as fsPromises from 'node:fs/promises';
import * as timers from 'node:timers';
import { createHash } from 'node:crypto';

import { Takumi } from './takumi.js';
import { Dummy } from './storage/dummy.js';
import { Local } from './storage/local.js';
import { doSthIgnoreErrs } from './utils.js';
import {
    FileStatus,
    type BasicFileInfo,
    type StorageClass,
    type PublicFileInfo,
    type RemoteFileInfo
} from './type.js';
import { Aria2 } from './storage/aria2.js';

const PROVIDERS = [
    {
        displayName: '原神',
        gameFilter: ['latest-diff', 'predl-latest-diff'],
        langFilter: ['zh-cn'],
        takumi: new Takumi(
            'https://sdk-static.mihoyo.com/hk4e_cn/mdk/launcher/api/resource?channel_id=1&key=eYd89JmJ&launcher_id=18&sub_channel_id=1',
            ['latest-diff', 'predl-latest-diff'],
            ['zh-cn']
        )
    },
    {
        displayName: '崩坏：星穹铁道',
        gameFilter: ['latest-diff', 'predl-latest-diff'],
        langFilter: ['zh-cn'],
        takumi: new Takumi(
            'https://api-launcher-static.mihoyo.com/hkrpg_cn/mdk/launcher/api/resource?channel_id=1&key=6KcVuOkbcqjJomjZ&launcher_id=33&sub_channel_id=1',
            ['latest-diff', 'predl-latest-diff'],
            ['zh-cn']
        )
    }
];

const BASE_DIR = '/tmp/kirara-test';
const STORAGE_DIR = BASE_DIR + '/files';
const PUBLIC_URL = 'http://example.com/files/';
await doSthIgnoreErrs(['EEXIST'], () =>
    fsPromises.mkdir(STORAGE_DIR, { recursive: true })
);
// const STORAGE = new Local(STORAGE_DIR, PUBLIC_URL);
const STORAGE = new Aria2(STORAGE_DIR, PUBLIC_URL);

// const STORAGE = new Dummy();

const PUBLIC_STATUS_FILE_PATH = BASE_DIR + '/status.json';
let publicStatus; // TODO: typing
let publicStatusHash: string;

async function removeDeprecatedFiles(
    storage: StorageClass,
    deprecatedFileList?: BasicFileInfo[]
) {
    if (deprecatedFileList) {
        for (const file of deprecatedFileList) {
            console.log('尝试移除', file.name);
            try {
                await storage.removeFile(file);
            } catch (err) {
                console.log('移除', file.name, '时发生错误', err);
            }
        }
    }
}

async function syncStorage(storage: StorageClass, fileList?: RemoteFileInfo[]) {
    const publicFileInfos: PublicFileInfo[] = [];
    if (fileList) {
        for (const file of fileList) {
            let info = await doSthIgnoreErrs(['ENOENT'], () =>
                storage.getFileInfo(file)
            );
            try {
                if (!info || info.status === FileStatus.ERROR) {
                    console.log('尝试下载', file.name);
                    await storage.downloadRemoteFile(file);
                    info = { status: FileStatus.DOWNLOADING };
                }
            } catch (err) {
                console.log('尝试下载', file.name, '时发生错误', err);
            }
            publicFileInfos.push({
                ...file,
                status: FileStatus.ERROR,
                ...info
            });
        }
    }
    return publicFileInfos;
}

async function sync() {
    let status = []; // TODO: typing
    for (const { takumi, ...rest } of PROVIDERS) {
        console.log('正在刷新 Takumi');
        try {
            if (await takumi.refresh()) {
                console.log('Takumi 已更新');
                await removeDeprecatedFiles(STORAGE, takumi.deprecatedFileList);
            }
        } catch (err) {
            console.log('刷新 Takumi 时发生错误', err);
        }
        try {
            status.push({
                ...rest,
                updatedAt: takumi.updatedAt,
                files: await syncStorage(STORAGE, takumi.fileList)
            });
        } catch (err) {
            console.log('同步存储时发生错误', err);
        }
    }
    debugger;
    const json = JSON.stringify(status);
    const hash = createHash('md5').update(json).digest('hex');
    if (hash !== publicStatusHash) {
        publicStatus = status;
        publicStatusHash = hash;
        await fsPromises.writeFile(PUBLIC_STATUS_FILE_PATH, json);
    }
}

timers.setInterval(sync, 60_000);
timers.setImmediate(sync);
