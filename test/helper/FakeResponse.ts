
export class FakeResponse {
    _status: number;
    _location: string;
    _json: any;
    _headers: string = "";

    /**
     * 
     * @param value
     * @returns {FakeResponse}
     */
    public status(value: number) {
        this._status = value;
        return this;
    }

    /**
     * 
     * @param value
     * @returns {FakeResponse}
     */
    public location(value: string) {
        this._location = value;
        return this;
    }

    /**
     * 
     * @param value
     * @returns {FakeResponse}
     */
    public json(value: any) {
        this._json = value;
        return this;
    }

    /**
     * 
     * @param key
     * @param value
     * @returns {FakeResponse}
     */
    public setHeader(key, value): FakeResponse {
        this._headers += `${key}:${value}\n`;
        return this;
    }
}
