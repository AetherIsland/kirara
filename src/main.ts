import * as fsPromises from 'node:fs/promises';
import * as timers from 'node:timers';
import * as path from 'node:path';

import { isEqual } from 'es-toolkit';

import { Dummy } from './storage/dummy.js';
import { Local } from './storage/local.js';
import { doSthIgnoreErrs } from './utils.js';
import {
    FileStatus,
    type AppConfig,
    type AppTask,
    type AppTaskGame,
    type BasicFileInfo,
    type FileStorage,
    type PublicFileInfo,
    type PublicStatus,
    type PublicStatusGame,
    type RemoteFileInfo
} from './type.js';
import { Aria2 } from './storage/aria2.js';
import {
    getChannelByLauncherId,
    HYPClient,
    KnownLauncherId
} from './hyp/client.js';
import { HYPFileProvider } from './hyp/provider.js';

const LauncherIdMap = new Map<string, KnownLauncherId>([
    ['miHoYoLauncher', KnownLauncherId.miHoYoLauncher],
    ['HoYoPlay', KnownLauncherId.HoYoPlay],
    ['BilibiliGenshin', KnownLauncherId.BilibiliGenshin],
    ['BilibiliStarRail', KnownLauncherId.BilibiliStarRail],
    ['BilibiliZZZ', KnownLauncherId.BilibiliZZZ]
]);

let publicStatus: PublicStatus;

async function loadConfig(path: Parameters<typeof fsPromises.readFile>[0]) {
    const configText = await fsPromises.readFile(path, 'utf8');
    const config: AppConfig = JSON.parse(configText);
    const errors = [];
    if (typeof config.storage?.type !== 'string') {
        errors.push('storage.type');
    }
    if (Array.isArray(config.tasks)) {
        for (let i = 0; i < config.tasks.length; ++i) {
            const task = config.tasks[i];
            if (typeof task.launcher.type !== 'string') {
                errors.push(`tasks[${i}].launcher.type`);
            }
            if (Array.isArray(task.filters)) {
                for (let j = 0; j < task.filters.length; ++j) {
                    const filter = task.filters[j];
                    if (typeof filter.matchGameBiz !== 'string') {
                        errors.push(`tasks[${i}].filters[${j}].matchGameBiz`);
                    }
                }
            } else {
                errors.push(`tasks[${i}].filters`);
            }
        }
    } else {
        errors.push('tasks');
    }
    if (errors.length) {
        console.error('缺少必要配置', errors);
        throw new Error('配置文件格式错误');
    }
    return config;
}

async function init(config: AppConfig) {
    let storage: FileStorage;
    const tasks: AppTask[] = [];
    await doSthIgnoreErrs(['EEXIST'], async () => {
        if (config.statusFile) {
            await fsPromises.mkdir(path.dirname(config.statusFile), {
                recursive: true
            });
        }
    });
    await doSthIgnoreErrs(['EEXIST'], async () => {
        if (config.storage.root) {
            await fsPromises.mkdir(config.storage.root, { recursive: true });
        }
    });
    switch (config.storage.type) {
        case 'dummy':
            storage = new Dummy();
            break;
        case 'local':
            if (!config.storage.root) {
                throw new Error('存储 Local 需要配置 storage.root');
            }
            storage = new Local(config.storage.root, config.storage.url);
            break;
        case 'aria2':
            if (!config.storage.root) {
                throw new Error('存储 Aria2 需要配置 storage.root');
            }
            storage = new Aria2(config.storage.root, config.storage.url);
            break;
        default:
            throw new Error('未知存储类型');
    }
    for (const taskConfig of config.tasks) {
        const launcherId = LauncherIdMap.get(taskConfig.launcher.type);
        if (!launcherId) {
            throw new Error('未知启动器类型');
        }
        const defaultChannel = getChannelByLauncherId(launcherId);
        const client = new HYPClient(launcherId, {
            language: taskConfig.launcher.language,
            channel: taskConfig.launcher.channel || defaultChannel.channel,
            sub_channel:
                taskConfig.launcher.subChannel || defaultChannel.sub_channel
        });
        const gameFilterMap = new Map();
        for (const filter of taskConfig.filters) {
            if (gameFilterMap.has(filter.matchGameBiz)) {
                throw new Error('游戏过滤器重复');
            }
            gameFilterMap.set(filter.matchGameBiz, filter);
        }
        const taskGames: AppTaskGame[] = [];
        for (const game of await client.getGames()) {
            const gameFilter =
                gameFilterMap.get(game.biz) ?? gameFilterMap.get('*');
            if (gameFilter) {
                taskGames.push({
                    id: game.id,
                    biz: game.biz,
                    display: game.display,
                    provider: new HYPFileProvider({
                        audioLanguages: gameFilter.audioLanguages,
                        branchMain: gameFilter.branchMain,
                        branchPreDownload: gameFilter.branchPreDownload
                    })
                });
            }
        }
        tasks.push({
            client,
            storage,
            games: taskGames
        });
    }
    return tasks;
}

async function removeDeprecatedFiles(
    storage: FileStorage,
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

async function syncStorage(storage: FileStorage, fileList?: RemoteFileInfo[]) {
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

async function executeTask(task: AppTask) {
    const promisesRemove: Promise<void>[] = [];
    const promisesSync: Promise<PublicStatusGame>[] = [];
    console.log('正在刷新启动器', task.client.launcher_id);
    const gamePackages = await task.client.getGamePackages(
        task.games.map((game) => game.id)
    );
    for (const game of task.games) {
        const gamePackage = gamePackages.find(
            (gamePackage) => gamePackage.game.id === game.id
        );
        if (!gamePackage) {
            console.error(
                '启动器 API 没有返回期望的游戏',
                game.id,
                game.biz,
                game.display.name
            );
            continue;
        }
        console.log('正在处理游戏', game.id, game.biz, game.display.name);
        game.provider.update(gamePackage);
        promisesRemove.push(
            removeDeprecatedFiles(
                task.storage,
                game.provider.deprecatedFileList
            )
        );
        promisesSync.push(
            syncStorage(task.storage, game.provider.fileList).then(
                (publicFileInfos) => ({
                    launcherId: task.client.launcher_id,
                    gameId: game.id,
                    gameBiz: game.biz,
                    gameName: game.display.name,
                    updatedAt: game.provider.updatedAt,
                    files: publicFileInfos
                })
            )
        );
    }
    await Promise.all(promisesRemove);
    return await Promise.all(promisesSync);
}

async function sync() {
    try {
        const promises = tasks.map((task) => executeTask(task));
        const status: PublicStatus = {
            games: (await Promise.all(promises)).flat()
        };
        if (!isEqual(status, publicStatus)) {
            publicStatus = status;
            if (config.statusFile) {
                await fsPromises.writeFile(
                    config.statusFile,
                    JSON.stringify(status)
                );
            }
        }
    } catch (err) {
        console.error('同步时发生错误', err);
    }
}

const config = await loadConfig('app.config.json');
const tasks = await init(config);
timers.setInterval(sync, 60_000);
timers.setImmediate(sync);
