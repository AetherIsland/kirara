export async function doSthIgnoreErrs<T>(
    errCodes: string[],
    sth: () => Promise<T>
) {
    try {
        return await sth();
    } catch (err: any) {
        if (!errCodes.includes('*') && !errCodes.includes(err?.code)) {
            throw err;
        }
    }
}
