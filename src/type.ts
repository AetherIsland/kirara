import { type HYPClient } from './hyp/client.js';
import { type GameInfo } from './hyp/GameInfo.js';
import {
    type HYPFileProvider,
    type HYPFileProviderOption
} from './hyp/provider.js';

export type BasicFileInfo = {
    name: string;
    md5: string; // TODO: check format
};

export type RemoteFileInfo = {
    name: string;
    size: number;
    required_free_space: number;
    md5: string; // TODO: check format
    url: string;
    tags: string[];
};

export enum FileStatus {
    ERROR = 'ERROR',
    READY = 'READY',
    DOWNLOADING = 'DOWNLOADING'
}

export type StoragedFileInfo = {
    status: FileStatus;
    path?: string;
    progress?: number;
};

export type PublicFileInfo = RemoteFileInfo & StoragedFileInfo;

export type PublicStatus = {
    games: PublicStatusGame[];
};

export type PublicStatusGame = {
    launcherId: HYPClient['launcher_id'];
    gameId: GameInfo['id'];
    gameBiz: GameInfo['biz'];
    gameName: GameInfo['display']['name'];
    updatedAt: HYPFileProvider['updatedAt'];
    files: PublicFileInfo[];
};

export interface FileStorage {
    getFileInfo(file: BasicFileInfo): Promise<StoragedFileInfo>;
    removeFile(file: BasicFileInfo): Promise<void>;
    downloadRemoteFile(remoteFile: RemoteFileInfo): Promise<void>;
}

export type AppConfig = {
    statusFile?: string;
    storage: {
        type: string;
        root?: string;
        url?: string;
    };
    tasks: AppConfigTask[];
};

export type AppConfigTask = {
    launcher: {
        type: string;
        language?: string;
        channel?: string;
        subChannel?: string;
    };
    filters: AppConfigGameFilter[];
};

export type AppConfigGameFilter = {
    matchGameBiz: string;
} & HYPFileProviderOption;

export type AppTask = {
    client: HYPClient;
    storage: FileStorage;
    games: AppTaskGame[];
};

export type AppTaskGame = Pick<GameInfo, 'id' | 'biz' | 'display'> & {
    provider: HYPFileProvider;
};
