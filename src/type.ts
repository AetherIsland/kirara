export type BasicFileInfo = {
    name: string;
    md5: string; // TODO: check format
};

export type RemoteFileInfo = {
    name: string;
    size: number;
    package_size: number;
    md5: string; // TODO: check format
    url: URL;
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
