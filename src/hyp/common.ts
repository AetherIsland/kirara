/**
 * 游戏标识信息
 */
export type GameId = {
    /**
     * 唯一 ID，一般为 10 位数字和字母
     */
    id: string;
    /**
     * 商业代号
     */
    biz: string;
};

/**
 * 图片信息
 */
export type Image = {
    url: string;
    link: string;
};

/**
 * 图标信息
 */
export type Icon = {
    url: string;
    hover_url: string;
    link: string;
};
