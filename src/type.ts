import { type HYPFileProviderOption } from './hyp/provider.js';

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
